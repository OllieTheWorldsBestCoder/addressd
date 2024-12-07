import { db } from '../config/firebase';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Address, Contribution } from '../types/address';
import { geohashForLocation } from 'geofire-common';

export class AddressOptimizationService {
  private addressCollection = 'addresses';
  private readonly DUPLICATE_DISTANCE_THRESHOLD = 50; // meters
  private readonly SIMILARITY_THRESHOLD = 0.85;

  async optimizeDatabase() {
    console.log('Starting database optimization...');
    try {
      // 1. Find potential duplicates
      const duplicateClusters = await this.findPotentialDuplicates();
      console.log(`Found ${duplicateClusters.length} potential duplicate clusters`);

      // 2. Merge similar addresses
      let mergedCount = 0;
      for (const cluster of duplicateClusters) {
        try {
          await this.mergeAddressCluster(cluster);
          mergedCount++;
        } catch (error) {
          console.error('Error merging cluster:', error);
        }
      }
      console.log(`Successfully merged ${mergedCount} address clusters`);

      // 3. Enhance address data
      await this.enhanceAddressData();
      
      return {
        clustersFound: duplicateClusters.length,
        mergedCount,
        success: true
      };
    } catch (error) {
      console.error('Error during database optimization:', error);
      throw error;
    }
  }

  private async findPotentialDuplicates(): Promise<Address[][]> {
    const addressesRef = collection(db, this.addressCollection);
    const snapshot = await getDocs(addressesRef);
    const addresses = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Address));
    const clusters: Address[][] = [];

    // Group by geographic proximity
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const cluster = [address];

      for (let j = i + 1; j < addresses.length; j++) {
        const otherAddress = addresses[j];
        const distance = this.calculateDistance(
          { lat: address.latitude, lng: address.longitude },
          { lat: otherAddress.latitude, lng: otherAddress.longitude }
        );

        if (distance <= this.DUPLICATE_DISTANCE_THRESHOLD) {
          const similarity = this.calculateAddressSimilarity(address, otherAddress);
          if (similarity >= this.SIMILARITY_THRESHOLD) {
            cluster.push(otherAddress);
          }
        }
      }

      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private async mergeAddressCluster(cluster: Address[]) {
    // 1. Select primary address (most complete/accurate)
    const primary = this.selectPrimaryAddress(cluster);

    // 2. Merge data from other addresses
    const merged = {
      ...primary,
      matchedAddresses: this.mergeMatchedAddresses(cluster),
      descriptions: this.mergeDescriptions(cluster),
      confidence: this.calculateMergedConfidence(cluster)
    };

    // 3. Update database
    await this.updateMergedAddress(merged, cluster);

    // 4. Delete old addresses
    for (const address of cluster) {
      if (address.id !== merged.id) {
        await deleteDoc(doc(db, this.addressCollection, address.id));
      }
    }
  }

  private selectPrimaryAddress(cluster: Address[]): Address {
    return cluster.reduce((best, current) => {
      const bestScore = this.calculateAddressCompleteness(best);
      const currentScore = this.calculateAddressCompleteness(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateAddressCompleteness(address: Address): number {
    let score = 0;
    
    // More matched addresses = better
    score += (address.matchedAddresses?.length || 0) * 0.2;
    
    // More descriptions = better
    score += (address.descriptions?.length || 0) * 0.3;
    
    // Has proper formatting
    if (address.formattedAddress.includes(',')) score += 0.2;
    
    // Has postcode
    if (/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i.test(address.formattedAddress)) {
      score += 0.3;
    }

    return score;
  }

  private async enhanceAddressData() {
    const addressesRef = collection(db, this.addressCollection);
    const snapshot = await getDocs(addressesRef);

    for (const doc of snapshot.docs) {
      const address = doc.data() as Address;
      
      // Recalculate geohash
      const geohash = geohashForLocation([address.latitude, address.longitude]);
      
      // Update confidence scores
      const confidence = this.calculateAddressConfidence(address);
      
      // Update the document
      await setDoc(doc.ref, {
        ...address,
        geohash,
        confidence,
        updatedAt: new Date()
      });
    }
  }

  private calculateDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = p1.lat * Math.PI / 180;
    const phi2 = p2.lat * Math.PI / 180;
    const deltaPhi = (p2.lat - p1.lat) * Math.PI / 180;
    const deltaLambda = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private async findSimilarAddresses(addresses: Address[]): Promise<Map<string, string[]>> {
    const similarAddresses = new Map<string, string[]>();

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const similar: string[] = [];

      for (let j = 0; j < addresses.length; j++) {
        if (i === j) continue;
        const otherAddress = addresses[j];
        const distance = this.calculateDistance(
          address.location,
          otherAddress.location
        );

        if (distance <= 10) { // 10 meters threshold
          similar.push(otherAddress.id);
        }
      }

      if (similar.length > 0) {
        similarAddresses.set(address.id, similar);
      }
    }

    return similarAddresses;
  }

  private calculateAddressSimilarity(a1: Address, a2: Address): number {
    // Calculate physical distance similarity
    const distance = this.calculateDistance(
      a1.location,
      a2.location
    );
    const distanceSimilarity = Math.max(0, 1 - distance / 1000); // Normalize to 0-1 range

    // Calculate text similarity between formatted addresses
    const textSimilarity = this.calculateTextSimilarity(
      a1.formattedAddress,
      a2.formattedAddress
    );

    // Weight the similarities (adjust weights as needed)
    return 0.7 * distanceSimilarity + 0.3 * textSimilarity;
  }

  private calculateTextSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateAddressConfidence(address: Address): number {
    let confidence = 0;
    
    // More matched addresses = higher confidence
    confidence += Math.min((address.matchedAddresses?.length || 0) * 0.1, 0.3);
    
    // More descriptions = higher confidence
    confidence += Math.min((address.descriptions?.length || 0) * 0.1, 0.3);
    
    // Has proper formatting
    if (address.formattedAddress.includes(',')) confidence += 0.2;
    
    // Has postcode
    if (/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i.test(address.formattedAddress)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1);
  }

  private async backupAddresses() {
    const snapshot = await getDocs(collection(db, this.addressCollection));
    const backup = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    
    await setDoc(doc(db, 'backups', new Date().toISOString()), {
      addresses: backup,
      timestamp: new Date()
    });
  }

  async updateSearchIndices(): Promise<void> {
    // Implement search index update logic here
  }

  private mergeMatchedAddresses(cluster: Address[]): Array<{rawAddress: string, matchedAt: Date}> {
    const allMatches = new Set<string>();
    const merged: Array<{rawAddress: string, matchedAt: Date}> = [];
    
    cluster.forEach(address => {
      address.matchedAddresses?.forEach(match => {
        if (!allMatches.has(match.rawAddress)) {
          allMatches.add(match.rawAddress);
          merged.push(match);
        }
      });
    });
    
    return merged;
  }

  private mergeDescriptions(cluster: Address[]): Contribution[] {
    const allDescriptions = new Set<string>();
    const merged: Contribution[] = [];
    
    cluster.forEach(address => {
      address.descriptions?.forEach(desc => {
        if (!allDescriptions.has(desc.content)) {
          allDescriptions.add(desc.content);
          merged.push({
            content: desc.content,
            createdAt: desc.createdAt instanceof Date ? desc.createdAt : desc.createdAt.toDate()
          });
        }
      });
    });
    
    return merged;
  }

  private calculateMergedConfidence(cluster: Address[]): number {
    // Start with the highest individual confidence
    let confidence = Math.max(...cluster.map(addr => this.calculateAddressConfidence(addr)));
    
    // Boost confidence based on cluster size
    confidence += Math.min((cluster.length - 1) * 0.1, 0.3);
    
    // Cap at 1.0
    return Math.min(confidence, 1);
  }

  private async updateMergedAddress(merged: Address, cluster: Address[]): Promise<void> {
    // Update the primary address document
    await setDoc(doc(db, this.addressCollection, merged.id), {
      ...merged,
      updatedAt: new Date()
    });

    // Create a record of the merge
    await setDoc(doc(db, 'addressMerges', new Date().toISOString()), {
      mergedId: merged.id,
      mergedAddresses: cluster.map(addr => ({
        id: addr.id,
        rawAddress: addr.rawAddress,
        formattedAddress: addr.formattedAddress
      })),
      timestamp: new Date()
    });
  }

  async optimizeAddresses(): Promise<void> {
    try {
      const addressesRef = collection(db, 'addresses');
      const addressesSnapshot = await getDocs(addressesRef);
      const addresses = addressesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Address[];

      // Find similar addresses
      const similarAddresses = await this.findSimilarAddresses(addresses);

      // Process each group of similar addresses
      for (const [mainId, similarIds] of similarAddresses) {
        const mainAddress = addresses.find(a => a.id === mainId);
        if (!mainAddress) continue;

        const similar = addresses.filter(a => similarIds.includes(a.id));
        
        // Merge descriptions and matched addresses
        const mergedMatchedAddresses = [
          ...(mainAddress.matchedAddresses || []),
          ...similar.flatMap(a => a.matchedAddresses || [])
        ];

        const mergedDescriptions = [
          ...(mainAddress.descriptions || []),
          ...similar.flatMap(a => a.descriptions || [])
        ];

        // Update the main address
        const mainRef = doc(db, 'addresses', mainId);
        await setDoc(mainRef, {
          ...mainAddress,
          matchedAddresses: mergedMatchedAddresses,
          descriptions: mergedDescriptions,
          updatedAt: new Date()
        }, { merge: true });

        // Delete the similar addresses
        for (const similarId of similarIds) {
          await deleteDoc(doc(db, 'addresses', similarId));
        }
      }
    } catch (error) {
      console.error('Error optimizing addresses:', error);
      throw error;
    }
  }
} 