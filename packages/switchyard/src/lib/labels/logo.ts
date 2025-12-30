/**
 * Goods Logo ZPL Graphic
 *
 * This file contains the Goods logo converted to ZPL GRF (Graphic Field) format
 * for printing on Zebra thermal printers.
 *
 * To update the logo:
 * 1. Go to https://labelary.com/viewer.html
 * 2. Click the "Image" button in the toolbar
 * 3. Upload the goods-logo.png file from: packages/admin/dashboard/src/assets/goods-logo.png
 * 4. Copy the generated ^GF command
 * 5. Replace LOGO_GRF_DATA below with the new data
 *
 * Logo specifications:
 * - Original: switchyard/packages/admin/dashboard/src/assets/goods-logo.png
 * - Recommended size for labels: ~150 dots wide (~0.75" at 203 DPI)
 * - The logo should be converted to black/white (1-bit) for thermal printing
 */

/**
 * Simplified Goods "G" logo rendered in ZPL graphic boxes
 * This is a fallback if no GRF data is available
 * Creates a simple stylized "G" that prints well on thermal labels
 *
 * Size: approximately 100x100 dots (0.5" at 203 DPI)
 */
export const LOGO_SIMPLIFIED_ZPL = `
^FO0,0^GB100,100,2^FS
^FO10,10^GB80,80,0,W^FS
^FO25,25^GB50,50,2^FS
^FO35,35^GB30,30,0,W^FS
^FO50,45^GB40,10,10^FS
^FO50,35^GB10,30,10^FS
`;

/**
 * Placeholder for the actual logo GRF data
 * This will be populated after converting the PNG using Labelary
 *
 * Format: ~DGR:GOODS.GRF,{total_bytes},{bytes_per_row},{hex_data}
 *
 * To generate this:
 * 1. Resize goods-logo.png to 150x150 pixels
 * 2. Convert to black and white (1-bit)
 * 3. Upload to labelary.com
 * 4. Copy the generated ^GF command and paste below
 */
export const LOGO_GRF_DOWNLOAD = `
~DGR:GOODS.GRF,2888,19,
:::::::::::::::::::Y07FFFFC0::Y07FFFFC0:Y0FFFFFFC0:X01FFFFFFC0:X03FFFFFFC0:X07FFFFFF80:
X0FFFFFFF80:W01FFFFFFF00:W03FFFFFFE00:W07FFFFFFC00:W0FFFFFF8C00:V01FFFFFF0C00:
V03FFFFFE0C00:V07FFFFFC0C00:V0FFFFFF80C00:U01FFFFFF01800:U03FFFFFE01800:
U07FFFFFC01800:U0FFFFFF803000:T01FFFFFF003000:T03FFFFFE003000:T07FFFFFC006000:
T0FFFFFF8006000:S01FFFFFF000C000:S03FFFFFE000C000:S07FFFFFC000C000:S0FFFFFF80018000:
R01FFFFFF00018000:R03FFFFFE00030000:R07FFFFFC00030000:R0FFFFFF800060000:
Q01FFFFFF000060000:Q03FFFFFE0000C0000:Q07FFFFFC0000C0000:Q0FFFFFF800180000:
P01FFFFFF000180000:P03FFFFFE000300000:P07FFFFFC000300000:P0FFFFFF8006007FF:
O01FFFFFF0006007FF:O03FFFFFE000C007FF:O07FFFFFC000C007FF:O0FFFFFF80018007FF:
N01FFFFFF00018007FF:N03FFFFFE00030007FF:N07FFFFFC00030007FF:N0FFFFFF800600::
M01FFFFFF00060::::M03FFFFFE000C::::M07FFFFFC000C::::M0FFFFFF8001800::
L01FFFFFF0001800::L03FFFFFE0003000::L07FFFFFC0003000::L0FFFFFF80006000::
K01FFFFFF00006000::K03FFFFFE0000C000::K07FFFFFC0000C000::K0FFFFFF800018000::
J01FFFFFF000018000:J03FFFFFFC0030000:J07FFFFFFC0030000:J0FFFFFFFF060000:
I01FFFFFFFF060000:I03FFFFFFFFC0000:I07FFFFFFFF80000:I0FFFFFFFFF00000:
H01FFFFFFFFE00000:H03FFFFFFFFC00000:H07FFFFFFFF800000:H0FFFFFFFFF000000:
G01FFFFFFFFE000000:G03FFFFFFFFC000000:G07FFFFFFFF8000000:G0FFFFFFFFF0000000:
F01FFFFFFFFE0000000:F03FFFFFFFFC0000000:F07FFFFFFFF80000000:F0FFFFFFFFF00000000:
E01FFFFFFFFE00000000:E03FFFFFFFFC00000000:E07FFFFFFFF800000000:E0FFFFFFFFF000000000:
`;

/**
 * Command to recall and print the stored logo
 * Use this after downloading the logo to printer memory
 */
export const LOGO_PRINT_COMMAND = `^XGR:GOODS.GRF,1,1^FS`;

/**
 * Get the logo ZPL commands for a label
 * @param x - X position (dots from left edge)
 * @param y - Y position (dots from top edge)
 * @param useSimplified - If true, uses the simplified box-drawn logo
 * @returns ZPL commands to print the logo at the specified position
 */
export function getLogoZPL(x: number, y: number, useSimplified = false): string {
  if (useSimplified) {
    // Offset the simplified logo commands to the specified position
    return `^FO${x},${y}${LOGO_SIMPLIFIED_ZPL.replace(/\^FO(\d+),(\d+)/g, (_, ox, oy) => {
      return `^FO${x + parseInt(ox)},${y + parseInt(oy)}`;
    })}`;
  }

  // Use the stored GRF logo
  return `^FO${x},${y}${LOGO_PRINT_COMMAND}`;
}

/**
 * Get the full logo setup including download command (call once per print session)
 * This downloads the logo graphic to the printer's memory
 */
export function getLogoDownloadZPL(): string {
  return LOGO_GRF_DOWNLOAD;
}

