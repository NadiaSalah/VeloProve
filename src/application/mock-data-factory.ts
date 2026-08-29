export type MockDataPreset =
  | 'user'
  | 'order'
  | 'product'
  | 'address'
  | 'payment'
  | 'auth'
  | 'arabic_user'
  | 'custom';

export interface MockDataOptions {
  preset?: MockDataPreset;
  schema?: Record<string, string | { type: string; format?: string; enum?: unknown[] }>;
  count?: number;
  locale?: 'en' | 'ar';
}

export class MockDataFactoryService {
  private static randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static randomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public static generate(options: MockDataOptions = {}): unknown[] {
    const count = Math.max(1, Math.min(options.count || 1, 500));
    const results: unknown[] = [];

    for (let i = 0; i < count; i++) {
      if (options.preset && options.preset !== 'custom') {
        results.push(this.generatePreset(options.preset, i + 1));
      } else if (options.schema) {
        results.push(this.generateFromSchema(options.schema, options.locale || 'en', i + 1));
      } else {
        results.push(this.generatePreset('user', i + 1));
      }
    }

    return results;
  }

  private static generatePreset(preset: MockDataPreset, index: number): Record<string, unknown> {
    const firstNamesEn = ['Alex', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'James', 'Mia'];
    const lastNamesEn = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'];
    const firstNamesAr = ['أحمد', 'محمد', 'فاطمة', 'سارة', 'علي', 'نور', 'يوسف', 'مريم', 'خالد'];
    const lastNamesAr = ['المنصوري', 'الغامدي', 'العتيبي', 'النجار', 'السيد', 'الحسن', 'الشريف'];

    switch (preset) {
      case 'user': {
        const fn = this.randomChoice(firstNamesEn);
        const ln = this.randomChoice(lastNamesEn);
        return {
          id: `usr_${this.randomUuid().slice(0, 8)}`,
          firstName: fn,
          lastName: ln,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}${index}@example.com`,
          role: this.randomChoice(['admin', 'member', 'editor', 'viewer']),
          phone: `+1-555-${this.randomNumber(100, 999)}-${this.randomNumber(1000, 9999)}`,
          isActive: true,
          createdAt: new Date(Date.now() - this.randomNumber(1, 90) * 86400000).toISOString()
        };
      }

      case 'arabic_user': {
        const fn = this.randomChoice(firstNamesAr);
        const ln = this.randomChoice(lastNamesAr);
        return {
          id: `usr_${this.randomUuid().slice(0, 8)}`,
          fullName: `${fn} ${ln}`,
          email: `user_${index}_${this.randomNumber(100, 999)}@domain.sa`,
          phone: `+966-5${this.randomNumber(10000000, 99999999)}`,
          city: this.randomChoice(['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'دبي', 'القاهرة']),
          country: 'Saudi Arabia',
          isActive: true
        };
      }

      case 'order': {
        const qty = this.randomNumber(1, 5);
        const unitPrice = this.randomNumber(20, 250);
        return {
          orderId: `ORD-${Date.now().toString().slice(-6)}-${index}`,
          customerId: `usr_${this.randomUuid().slice(0, 8)}`,
          itemsCount: qty,
          totalAmount: qty * unitPrice,
          currency: 'USD',
          status: this.randomChoice(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']),
          paymentMethod: this.randomChoice(['CREDIT_CARD', 'PAYPAL', 'APPLE_PAY', 'STRIPE']),
          placedAt: new Date().toISOString()
        };
      }

      case 'product': {
        const categories = ['Electronics', 'Home & Kitchen', 'Fashion', 'Health & Fitness', 'Books'];
        const cat = this.randomChoice(categories);
        const price = this.randomNumber(15, 899);
        return {
          productId: `prod_${this.randomUuid().slice(0, 8)}`,
          title: `Premium ${cat} Item #${index}`,
          category: cat,
          price,
          inStock: this.randomChoice([true, true, true, false]),
          stockQuantity: this.randomNumber(0, 200),
          rating: (this.randomNumber(35, 50) / 10),
          sku: `SKU-${cat.slice(0, 3).toUpperCase()}-${this.randomNumber(1000, 9999)}`
        };
      }

      case 'address': {
        return {
          street: `${this.randomNumber(100, 9999)} Market Street, Suite ${this.randomNumber(10, 80)}`,
          city: this.randomChoice(['San Francisco', 'New York', 'Austin', 'Seattle', 'Chicago', 'Boston']),
          state: this.randomChoice(['CA', 'NY', 'TX', 'WA', 'IL', 'MA']),
          postalCode: `${this.randomNumber(10000, 99999)}`,
          country: 'United States'
        };
      }

      case 'payment': {
        return {
          transactionId: `txn_${this.randomUuid()}`,
          cardNumber: `4532-xxxx-xxxx-${this.randomNumber(1000, 9999)}`,
          cardBrand: this.randomChoice(['Visa', 'Mastercard', 'Amex']),
          expiryDate: `${this.randomNumber(1, 12).toString().padStart(2, '0')}/${this.randomNumber(26, 30)}`,
          cvv: `${this.randomNumber(100, 999)}`,
          status: 'SUCCESS'
        };
      }

      case 'auth': {
        return {
          accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: `usr_${index}`, iat: Date.now() })).toString('base64')}.mock_signature_${this.randomUuid().slice(0, 12)}`,
          tokenType: 'Bearer',
          expiresIn: 3600,
          refreshToken: `ref_${this.randomUuid()}`
        };
      }

      default:
        return { id: index, data: 'Sample' };
    }
  }

  private static generateFromSchema(
    schema: Record<string, string | { type: string; format?: string; enum?: unknown[] }>,
    locale: 'en' | 'ar',
    index: number
  ): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    for (const [key, fieldDef] of Object.entries(schema)) {
      const typeStr = typeof fieldDef === 'string' ? fieldDef.toLowerCase() : fieldDef.type?.toLowerCase() || 'string';
      const k = key.toLowerCase();

      // Check enum
      if (typeof fieldDef === 'object' && Array.isArray(fieldDef.enum) && fieldDef.enum.length > 0) {
        record[key] = this.randomChoice(fieldDef.enum);
        continue;
      }

      // Contextual inference by field name
      if (k.includes('id') || k === '_id') {
        record[key] = `${k}_${this.randomUuid().slice(0, 8)}`;
      } else if (k.includes('email')) {
        record[key] = `user.${index}.${this.randomNumber(10, 99)}@example.com`;
      } else if (k.includes('name') || k.includes('user')) {
        record[key] = locale === 'ar' ? this.randomChoice(['أحمد السعيد', 'فاطمة الزهراء', 'سارة خالد']) : this.randomChoice(['Alex Johnson', 'Emma Smith', 'Liam Williams']);
      } else if (k.includes('phone') || k.includes('mobile')) {
        record[key] = `+1-555-${this.randomNumber(100, 999)}-${this.randomNumber(1000, 9999)}`;
      } else if (k.includes('price') || k.includes('amount') || k.includes('cost') || k.includes('balance')) {
        record[key] = this.randomNumber(10, 500);
      } else if (k.includes('is') || k.includes('has') || k.includes('active') || k.includes('enabled') || typeStr === 'boolean') {
        record[key] = this.randomChoice([true, false]);
      } else if (k.includes('date') || k.includes('at') || k.includes('time')) {
        record[key] = new Date().toISOString();
      } else if (typeStr === 'number' || typeStr === 'integer') {
        record[key] = this.randomNumber(1, 100);
      } else {
        record[key] = `${key}_value_${index}`;
      }
    }

    return record;
  }
}
