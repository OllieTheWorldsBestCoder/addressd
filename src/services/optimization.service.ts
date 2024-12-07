import { Address, Contribution } from '../types/address';
import { db } from '../config/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { getVectorDistance } from '../utils/vector';

export class OptimizationService {
  private readonly DUPLICATE_DISTANCE_THRESHOLD = 10; // meters

  private async findDuplicateClusters(addresses: Address[]): Promise<Address[][]> {
    const clusters: Address[][] = [];
    const processed = new Set<string>();

    for (let i = 0; i < addresses.length; i++) {
      if (processed.has(addresses[i].id)) continue;
      
      const cluster: Address[] = [addresses[i]];
      processed.add(addresses[i].id);

      for (let j = i + 1; j < addresses.length; j++) {
        if (processed.has(addresses[j].id)) continue;
        
        const otherAddress = addresses[j];
        const distance = getVectorDistance(
          addresses[i].location,
          otherAddress.location
        );

        if (distance <= this.DUPLICATE_DISTANCE_THRESHOLD) {
          cluster.push(otherAddress);
          processed.add(otherAddress.id);
        }
      }

      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private mergeClusters(cluster: Address[]): Address {
    // Sort by number of matched addresses and descriptions
    const sorted = [...cluster].sort((a, b) => {
      const aScore = (a.matchedAddresses?.length || 0) + (a.descriptions?.length || 0);
      const bScore = (b.matchedAddresses?.length || 0) + (b.descriptions?.length || 0);
      return bScore - aScore;
    });

    const primary = sorted[0];
    const allMatches = new Set<string>();
    const mergedMatches: Array<{ rawAddress: string; timestamp: string }> = [];
    const mergedDescriptions: Contribution[] = [];

    // Merge matched addresses
    cluster.forEach(address => {
      address.matchedAddresses?.forEach(match => {
        if (!allMatches.has(match.rawAddress)) {
          allMatches.add(match.rawAddress);
          mergedMatches.push({
            rawAddress: match.rawAddress,
            timestamp: match.timestamp
          });
        }
      });
    });

    // Merge descriptions
    cluster.forEach(address => {
      if (address.descriptions) {
        mergedDescriptions.push(...address.descriptions);
      }
    });

    return {
      ...primary,
      matchedAddresses: mergedMatches,
      descriptions: mergedDescriptions,
      updatedAt: new Date()
    };
  }

  private async updateMergedAddress(merged: Address, cluster: Address[]): Promise<void> {
    const mergeLog = {
      mergedAddressId: merged.id,
      mergedAddresses: cluster.map(addr => ({
        id: addr.id,
        formattedAddress: addr.formattedAddress
      })),
      timestamp: new Date()
    };

    // Update merged address
    await setDoc(doc(db, 'addresses', merged.id), merged);

    // Log the merge
    await setDoc(doc(db, 'mergeLogs', `${merged.id}_${Date.now()}`), mergeLog);
  }

  async optimizeAddresses(): Promise<void> {
    try {
      // 1. Get all addresses
      const addressesRef = collection(db, 'addresses');
      const snapshot = await getDocs(addressesRef);
      const addresses = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Address[];

      // 2. Find and merge duplicate clusters
      const clusters = await this.findDuplicateClusters(addresses);
      
      for (const cluster of clusters) {
        // 3. Merge the cluster
        const merged = this.mergeClusters(cluster);

        // 4. Update database
        await this.updateMergedAddress(merged, cluster);

        // 5. Delete old addresses except the merged one
        for (const address of cluster) {
          if (address.id !== merged.id) {
            await deleteDoc(doc(db, 'addresses', address.id));
          }
        }
      }
    } catch (error) {
      console.error('Error optimizing addresses:', error);
      throw error;
    }
  }
} 