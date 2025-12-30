# Goods Scanner App

React Native application for Zebra TC58 mobile computers. Provides barcode scanning, inventory management, order picking, and direct printing to Zebra ZD421 printers.

## Features

- **Barcode Scanning**: Integrates with Zebra DataWedge for hardware scanner input
- **Inventory Management**: Look up products, view stock levels, adjust inventory
- **Order Picking**: View assigned orders, pick items, print bag labels
- **Direct Printing**: Print labels directly to ZD421 via TCP (no backend required)
- **Supabase Auth**: Secure authentication with Supabase

## Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for TC58 deployment)
- Zebra TC58 device or emulator

## Setup

### 1. Install Dependencies

```bash
cd apps/scanner-app
npm install
# or
yarn install
```

### 2. Configure Environment

Create a `.env` file in the app directory:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
API_BASE_URL=http://your-backend:9000
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

### 3. Configure DataWedge on TC58

1. Open **DataWedge** app on the TC58
2. Create a new profile for `com.goodsgrocery.scanner`
3. Enable **Barcode Input**
4. Configure **Intent Output**:
   - Intent Action: `com.goodsgrocery.scanner.SCAN`
   - Intent Category: `android.intent.category.DEFAULT`
   - Intent Delivery: `Broadcast Intent`

### 4. Run the App

```bash
# Start Metro bundler
npm start

# Run on connected device
npm run android
```

## Project Structure

```
scanner-app/
├── App.tsx                 # Main app component
├── src/
│   ├── config/             # App configuration
│   ├── lib/
│   │   ├── api.ts          # Scanner API client
│   │   ├── datawedge.ts    # DataWedge integration
│   │   ├── labels.ts       # ZPL label templates
│   │   ├── printer.ts      # Direct printing via TCP
│   │   └── supabase.ts     # Supabase client
│   ├── navigation/         # React Navigation setup
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── InventoryScanScreen.tsx
│       ├── LoginScreen.tsx
│       ├── OrdersScreen.tsx
│       └── SettingsScreen.tsx
├── package.json
└── tsconfig.json
```

## Label Printing

The app can print directly to the ZD421 without backend involvement:

```typescript
import { sendToPrinter } from './src/lib/printer';
import { generateBagLabel } from './src/lib/labels';

const zpl = generateBagLabel({
  customerName: 'John',
  items: ['Milk', 'Eggs', 'Bread'],
  bagNumber: 1,
  totalBags: 2,
  bagId: 'BAG-001',
  temperatureZone: 'chilled',
});

await sendToPrinter(zpl);
```

## API Integration

The app communicates with the Switchyard Scanner API:

| Endpoint | Purpose |
|----------|---------|
| `GET /scanner` | Check API status |
| `GET /scanner/inventory/lookup` | Look up product by barcode |
| `POST /scanner/inventory/scan` | Process inventory scan |
| `GET /scanner/orders` | Get assigned orders |

## Building for Production

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/
```

## Troubleshooting

### DataWedge not sending scans

1. Verify profile is active for your app
2. Check Intent Action matches exactly
3. Ensure Intent Output is enabled

### Printer connection failed

1. Verify printer IP is correct
2. Check printer is on the same network
3. Confirm port 9100 is open on printer

### API authentication errors

1. Verify Supabase credentials
2. Check user has scanner permissions
3. Ensure API URL is correct

