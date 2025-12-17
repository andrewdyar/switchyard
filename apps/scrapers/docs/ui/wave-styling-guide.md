# Wave Styling Guide for Location Bar

If the current SVG mask approach doesn't render the waves correctly, here's the most efficient way to recreate them:

## Option 1: Use an SVG File (Recommended)

1. **Create a wave SVG file** (`static/wave-bottom.svg`):
   ```svg
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 40" preserveAspectRatio="none">
     <path d="M0,20 Q150,0 300,20 T600,20 T900,20 T1200,20 L1200,40 L0,40 Z" fill="white"/>
   </svg>
   ```

2. **Update CSS** to use the file:
   ```css
   .location-bar::after {
       background-image: url('/static/wave-bottom.svg');
       background-size: 100% 100%;
       background-repeat: no-repeat;
       background-position: bottom;
   }
   ```

## Option 2: Use a PNG Image

1. **Create a wave PNG** (18px height, any width, transparent background with white waves)
   - Use a design tool (Figma, Sketch, Photoshop)
   - Draw smooth wave curves
   - Export as PNG with transparency
   - Recommended: 1200px width for high DPI displays

2. **Save as** `static/wave-bottom.png`

3. **Update CSS**:
   ```css
   .location-bar::after {
       background-image: url('/static/wave-bottom.png');
       background-size: 100% 18px;
       background-repeat: repeat-x;
       background-position: bottom;
   }
   ```

## Option 3: Use CSS clip-path (Current - may need adjustment)

The current implementation uses SVG mask. If it's not working, the clip-path polygon approach can work but needs precise coordinates.

## Recommended Approach

**Use Option 1 (SVG file)** - it's:
- Scalable (vector)
- Small file size
- Easy to adjust wave amplitude/frequency
- Works across all browsers

The SVG path `M0,20 Q150,0 300,20 T600,20 T900,20 T1200,20` creates smooth waves:
- `M0,20` - Start at middle
- `Q150,0 300,20` - Quadratic curve creating first wave
- `T600,20 T900,20 T1200,20` - Continue smooth waves

Adjust the numbers to change wave size:
- Smaller numbers (e.g., `Q100,0 200,20`) = smaller, tighter waves
- Larger numbers (e.g., `Q200,0 400,20`) = larger, wider waves
- Change `0` to `10` or `-10` to adjust wave height

