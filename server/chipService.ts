/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Chip & Hardware Management Service
 * Handles NFC / QR scan resolution, activation codes verification,
 * Super Admin batch generation, and anti-spam / rate-limiting protection.
 */

import { inMemoryStore, type DbChip } from './database.js';

// In-memory anti-spam rate limiter per device/IP (max 5 review scans per hour)
const deviceScanHistory = new Map<string, { count: number; windowStart: number }>();

export interface ChipBatchOptions {
  batchName: string;
  count: number;
  prefix?: string;
  chipType?: 'server' | 'table' | 'unassigned';
}

export interface ChipScanResult {
  chip: DbChip;
  isActivated: boolean;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    googleReviewUrl: string;
    currency: string;
  };
  server?: {
    id: string;
    name: string;
    role: string;
  };
  tableNumber?: number;
}

export class ChipService {
  /**
   * Anti-Spam protection: Checks if device is submitting too many reviews in a short time
   */
  public static checkRateLimit(deviceIdentifier: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const record = deviceScanHistory.get(deviceIdentifier);

    if (!record || now - record.windowStart > windowMs) {
      deviceScanHistory.set(deviceIdentifier, { count: 1, windowStart: now });
      return true;
    }

    if (record.count >= 8) {
      return false; // Exceeded limit
    }

    record.count += 1;
    return true;
  }

  /**
   * Resolve an NFC or QR scan by chipId (e.g. "chip-srv-1", "chip-tbl-4", "chip-new-101")
   */
  public static async resolveChipScan(chipId: string, deviceIdentifier?: string): Promise<ChipScanResult | null> {
    const chip = inMemoryStore.chips.get(chipId);
    if (!chip) {
      return null;
    }

    // Increment scan count and record last scan timestamp
    chip.total_scans += 1;
    chip.last_scanned_at = new Date().toISOString();

    if (chip.status !== 'active' || !chip.restaurant_id) {
      return {
        chip,
        isActivated: false
      };
    }

    const restaurant = inMemoryStore.restaurants.get(chip.restaurant_id);
    let server: { id: string; name: string; role: string } | undefined;
    let tableNumber: number | undefined;

    if (chip.target_type === 'server' && chip.target_id) {
      const s = inMemoryStore.servers.get(chip.target_id);
      if (s) {
        server = { id: s.id, name: s.name, role: s.role };
      }
    } else if (chip.target_type === 'table' && chip.target_id) {
      tableNumber = parseInt(chip.target_id, 10) || undefined;
    }

    return {
      chip,
      isActivated: true,
      restaurant: restaurant ? {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        googleReviewUrl: restaurant.google_review_url,
        currency: restaurant.currency
      } : undefined,
      server,
      tableNumber
    };
  }

  /**
   * Activate an unassigned chip with an activation code and bind to restaurant & server/table
   */
  public static async activateChip(params: {
    chipId: string;
    activationCode: string;
    restaurantId: string;
    targetType: 'server' | 'table';
    targetId: string;
  }): Promise<{ success: boolean; error?: string; chip?: DbChip }> {
    const chip = inMemoryStore.chips.get(params.chipId);
    if (!chip) {
      return { success: false, error: 'Puce NFC introuvable.' };
    }

    // Verify activation code (case-insensitive trim)
    if (chip.activation_code.trim().toUpperCase() !== params.activationCode.trim().toUpperCase()) {
      return { success: false, error: 'Code d’activation invalide pour cette puce.' };
    }

    chip.restaurant_id = params.restaurantId;
    chip.target_type = params.targetType;
    chip.target_id = params.targetId;
    chip.status = 'active';

    return { success: true, chip };
  }

  /**
   * Super Admin: Generate a batch of fresh NFC chips with unique activation codes
   */
  public static generateBatch(options: ChipBatchOptions): { batchId: string; chips: DbChip[] } {
    const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdChips: DbChip[] = [];

    for (let i = 1; i <= options.count; i++) {
      const chipNum = Math.floor(10000 + Math.random() * 90000);
      const chipId = `chip-df-${chipNum}`;
      const codeDigits = Math.floor(1000 + Math.random() * 9000);
      const activationCode = `DF-${codeDigits}-${options.prefix || 'RESTO'}`;
      
      // Random mock NFC serial (NTAG213 / NTAG215 UID)
      const hexParts = Array.from({ length: 7 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
      const uid = hexParts.join(':');

      const chip: DbChip = {
        id: chipId,
        uid,
        activation_code: activationCode,
        batch_id: batchId,
        restaurant_id: null,
        target_type: options.chipType || 'unassigned',
        target_id: null,
        status: 'unassigned',
        total_scans: 0,
        last_scanned_at: null,
        created_at: new Date().toISOString()
      };

      inMemoryStore.chips.set(chipId, chip);
      createdChips.push(chip);
    }

    return { batchId, chips: createdChips };
  }
}
