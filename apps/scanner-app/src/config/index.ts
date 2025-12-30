/**
 * Scanner App Configuration
 */

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || "https://your-project.supabase.co",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  },

  // Backend API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || "http://localhost:9000",
  },

  // Zebra Printer Configuration
  printer: {
    host: process.env.PRINTER_IP || "192.168.1.100",
    port: parseInt(process.env.PRINTER_PORT || "9100", 10),
  },

  // DataWedge Configuration
  dataWedge: {
    // Intent action that DataWedge will broadcast scans to
    intentAction: "com.goodsgrocery.scanner.SCAN",
    // Intent category
    intentCategory: "android.intent.category.DEFAULT",
  },
};

export default config;

