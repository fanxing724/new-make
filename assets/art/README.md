# Card illustrations

`starlight.webp` is the original embedded night illustration, extracted unchanged from the existing `cards/art.ts`.

`light.webp` is a daylight companion generated with the built-in image_gen tool using the original as the character reference. It is resized to 800 px wide and encoded as WebP for embedding in SVG cards.

Run `node tools/art.mjs` after updating images or `config.json`, then `node tools/build.mjs`. Both background variants are regenerated together. Never edit `cards/art.ts` or the function artifacts by hand.

Final generation prompt:

```text
Use case: identity-preserve. Asset type: wide illustration background for light-theme GitHub statistics SVG cards. Input image is the character identity and anime illustration reference. Create a daylight companion illustration preserving this exact young anime character's silver-blue long hair, cyan eyes, cyan star hairclip and star-decorated oversized blue jacket, face and recognizable design. Change the night scene into airy soft daylight with pale blue sky, delicate white clouds, faint peach highlights and subtle star motifs. Landscape 16:9 composition: character on right third, face around 70% across and 40% down, upper body visible; left 60% very pale, quiet open sky with ample negative space for dark statistics text. Soft pastel blue-white palette, gentle clean anime linework, luminous but not washed-out character, low-contrast background. No text, numbers, logos, watermarks, interface or border. Keep character recognizable and uncluttered. Opaque background.
```
