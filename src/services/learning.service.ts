import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, increment, query, where, getDocs, addDoc } from 'firebase/firestore';
import { MatchingPattern, MatchingResult, AddressFeedback } from '../types/address';
import { createHash } from 'crypto';

export class LearningService {
  private patternsCollection = 'matchingPatterns';
  private feedbackCollection = 'addressFeedback';

  async updateFromFeedback(feedback: AddressFeedback) {
    // Extract successful patterns
    const patterns = this.extractPatterns(
      feedback.inputAddress,
      feedback.matchedAddress
    );

    // Update pattern confidence
    await this.updatePatternConfidence(
      patterns,
      feedback.isPositive
    );

    // Generate new patterns if feedback is positive
    if (feedback.isPositive) {
      await this.generateNewPatterns(
        feedback.inputAddress,
        feedback.matchedAddress
      );
    }
  }

  private extractPatterns(input: string, matched: string): string[] {
    const patterns: string[] = [];
    
    // Pattern 1: Word order flexibility
    const inputWords = input.toLowerCase().split(/\s+/);
    const matchedWords = matched.toLowerCase().split(/\s+/);
    const commonWords = inputWords.filter(w => matchedWords.includes(w));
    if (commonWords.length > 0) {
      patterns.push(`word_order:${commonWords.sort().join('_')}`);
    }

    // Pattern 2: Number handling
    const inputNumbers = input.match(/\d+/g) || [];
    const matchedNumbers = matched.match(/\d+/g) || [];
    if (inputNumbers.length > 0 && matchedNumbers.length > 0) {
      patterns.push(`numbers:${inputNumbers.join('_')}`);
    }

    // Pattern 3: Postcode format
    const postcodePattern = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    const inputPostcode = input.match(postcodePattern)?.[0];
    const matchedPostcode = matched.match(postcodePattern)?.[0];
    if (inputPostcode && matchedPostcode) {
      patterns.push(`postcode:${inputPostcode}`);
    }

    // Pattern 4: Building identifiers
    const buildingWords = ['house', 'building', 'flat', 'apartment', 'suite'];
    const inputBuilding = buildingWords.find(w => input.toLowerCase().includes(w));
    if (inputBuilding) {
      patterns.push(`building_type:${inputBuilding}`);
    }

    return patterns;
  }

  private async updatePatternConfidence(patterns: string[], isPositive: boolean): Promise<void> {
    try {
      for (const pattern of patterns) {
        const patternQuery = query(
          collection(db, this.patternsCollection),
          where('pattern', '==', pattern)
        );
        const patternDocs = await getDocs(patternQuery);

        for (const patternDoc of patternDocs.docs) {
          const patternData = patternDoc.data() as MatchingPattern;
          
          // Update counts
          if (isPositive) {
            patternData.successCount++;
          } else {
            patternData.failureCount++;
          }

          // Recalculate confidence
          const total = patternData.successCount + patternData.failureCount;
          patternData.confidence = patternData.successCount / total;

          // Update document
          await updateDoc(doc(db, this.patternsCollection, patternDoc.id), {
            ...patternData,
            lastUsed: new Date(),
            updatedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error updating pattern confidence:', error);
    }
  }

  private async generateNewPatterns(input: string, matched: string): Promise<void> {
    try {
      const patterns = this.extractNewPatterns(input, matched);
      
      for (const pattern of patterns) {
        // Check if pattern already exists
        const patternQuery = query(
          collection(db, this.patternsCollection),
          where('pattern', '==', pattern)
        );
        const existingPatterns = await getDocs(patternQuery);

        if (existingPatterns.empty) {
          // Create new pattern
          const newPattern: MatchingPattern = {
            id: crypto.randomUUID(),
            pattern,
            successCount: 1,
            failureCount: 0,
            confidence: 0.5, // Initial confidence
            lastUsed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await addDoc(collection(db, this.patternsCollection), newPattern);
        }
      }
    } catch (error) {
      console.error('Error generating new patterns:', error);
    }
  }

  private extractNewPatterns(input: string, matched: string): string[] {
    const patterns: string[] = [];
    
    // Pattern 1: Word order flexibility
    const inputWords = input.toLowerCase().split(/\s+/);
    const matchedWords = matched.toLowerCase().split(/\s+/);
    const commonWords = inputWords.filter(w => matchedWords.includes(w));
    if (commonWords.length > 0) {
      patterns.push(`word_order:${commonWords.sort().join('_')}`);
    }

    // Pattern 2: Number handling
    const inputNumbers = input.match(/\d+/g) || [];
    const matchedNumbers = matched.match(/\d+/g) || [];
    if (inputNumbers.length > 0 && matchedNumbers.length > 0) {
      patterns.push(`numbers:${inputNumbers.join('_')}`);
    }

    // Pattern 3: Postcode format
    const postcodePattern = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    const inputPostcode = input.match(postcodePattern)?.[0];
    const matchedPostcode = matched.match(postcodePattern)?.[0];
    if (inputPostcode && matchedPostcode) {
      patterns.push(`postcode:${inputPostcode}`);
    }

    // Pattern 4: Building identifiers
    const buildingWords = ['house', 'building', 'flat', 'apartment', 'suite'];
    const inputBuilding = buildingWords.find(w => input.toLowerCase().includes(w));
    if (inputBuilding) {
      patterns.push(`building_type:${inputBuilding}`);
    }

    return patterns;
  }

  async getMatchingConfidence(input: string, potential: string): Promise<number> {
    const patterns = this.extractPatterns(input, potential);
    let totalConfidence = 0;
    let patternCount = 0;

    for (const pattern of patterns) {
      const patternId = createHash('md5').update(pattern).digest('hex');
      const patternDoc = await getDoc(doc(db, this.patternsCollection, patternId));
      
      if (patternDoc.exists()) {
        const data = patternDoc.data() as MatchingPattern;
        totalConfidence += data.confidence;
        patternCount++;
      }
    }

    return patternCount > 0 ? totalConfidence / patternCount : 0;
  }
} 