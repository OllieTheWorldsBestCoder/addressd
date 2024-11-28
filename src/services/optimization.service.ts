import { db } from '../config/firebase';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Address } from '../types/address';
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
    const addresses = snapshot.docs.map(doc => doc.data() as Address);
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

  private calculateDistance(p1: {lat: number, lng: number}, p2: {lat: number, lng: number}): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateAddressSimilarity(a1: Address, a2: Address): number {
    const s1 = a1.formattedAddress.toLowerCase();
    const s2 = a2.formattedAddress.toLowerCase();
    
    const words1 = new Set(s1.split(/[\s,]+/));
    const words2 = new Set(s2.split(/[\s,]+/));
    
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
} 