---
name: animated-landing-pages
description: >-
  Designs and implements premium animated landing pages with AI-generated
  visuals and looping video backgrounds. Use when building a hero section
  with video background, creating a marketing page with motion-first design,
  implementing scroll-tied playback, blending dark-mode video into layouts,
  generating animated media for promotional websites, or building React or
  Tailwind landing pages with aspect-ratio-matched media blocks and motion
  effects.
metadata:
  dependencies: []
---

# Animated Landing Pages

If `.khuym/onboarding.json` is missing or stale for the current repo, stop and invoke `khuym:using-khuym` before continuing.

Use this skill to turn a motion-first landing-page concept into a working site without losing cohesion between art direction, generated media, layout structure, and implementation details.

## Start Here

1. Detect the real stack from the repo before borrowing the tutorial stack. Prefer the repo's actual framework, router, styling system, icon library, and asset pipeline over forcing Vite, React, Tailwind, or Material Icons.
2. Lock the page promise in one sentence: who the page is for, what it sells, and what feeling the motion should create.
3. Decide which sections need custom media, which only need layout inspiration, and which should stay static for contrast.
4. Read `references/workflow.md` before generating assets or code.
5. Read `references/prompt-library.md` when you need prompt wording for media generation or AI-assisted coding.
6. Read `references/pressure-scenarios.md` if the request is vague, over-scoped, or drifting toward generic "AI slop."

## Hard Rules

- Match asset aspect ratio to the final container before animating anything.
- Treat dark video as a theme input. Brighten text, deepen surrounding backgrounds, and add top and bottom fade overlays when hard video edges show.
- Make scroll-tied playback an enhancement, not the default. First make the section look correct as a normal autoplay loop.
- Do not ship hotlinked generation URLs to production. Download and host final assets on repo-owned storage or a stable CDN.
- Prefer one cohesive motion language across the page instead of many unrelated animation ideas.
- When three cards can share one source video, prefer one synchronized video with background-position slicing over three separate videos.
- Keep the tutorial's stack suggestions subordinate to the local repo. Reuse the existing frontend architecture whenever possible.

## Workflow

### Phase 1: Direction and references

1. Gather one visual reference for the hero mood and one or more references for section structure.
2. Separate style references from layout references. Do not copy both from the same source if that would make the page derivative.
3. Define the media plan early:
   - hero background loop
   - inline character or product loop
   - optional footer or closing-section loop
   - sections that should stay static

### Phase 2: Media generation

1. Generate still images first, then animate the winners.
2. For background loops, prefer prompts that suppress camera movement and preserve loop stability.
3. For inline media blocks, generate at the aspect ratio the section actually needs.
4. If one section needs a composite scene, combine source images into one still before animation rather than trying to splice multiple videos later.

### Phase 3: Layout generation

1. Start from a strong hero prompt or existing hero reference.
2. Feed the generated media URLs or downloaded local assets into the coding prompt.
3. Force theme adjustments explicitly when the media palette demands it. Dark media usually means light text, darker surfaces, and softer edge treatments.
4. Build the rest of the page from structure references, not by cloning copy or exact layouts.

### Phase 4: Integration and motion

1. Blend video into the page with overlays, masks, gradients, or surface treatments before tuning typography.
2. Replace weak placeholder imagery with section-specific motion only where it improves the story.
3. Add scroll-tied playback only to sections where scrubbed motion reinforces the narrative.
4. When scroll-tied playback is required, throttle updates through the browser render loop so frames advance only after the previous draw completes.

### Phase 5: Verification

1. Verify the page in a real browser.
2. Check desktop and mobile separately. Motion-heavy layouts often fail through cropping or text collisions, not syntax errors.
3. Check loop seams, poster flashes, overlay banding, and container aspect-ratio mismatches.
4. Confirm final asset hosting is stable and not relying on expiring generation URLs.

## Implementation Patterns

### CSS overlay for dark video blending

```css
.video-section {
  position: relative;
}
.video-section::before,
.video-section::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  height: 120px;
  z-index: 1;
  pointer-events: none;
}
.video-section::before {
  top: 0;
  background: linear-gradient(to bottom, var(--bg-dark), transparent);
}
.video-section::after {
  bottom: 0;
  background: linear-gradient(to top, var(--bg-dark), transparent);
}
```

### Scroll-tied playback throttle

```js
const video = document.querySelector('.scroll-video');
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const rect = video.getBoundingClientRect();
      const progress = 1 - (rect.bottom / (rect.height + window.innerHeight));
      video.currentTime = Math.max(0, Math.min(video.duration, progress * video.duration));
      ticking = false;
    });
    ticking = true;
  }
});
```

### Aspect-ratio container

```css
.media-block {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 1rem;
}
.media-block video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Key principles

- Gather references before prompting; generate stills before videos.
- Keep the site coherent — lower sections should feel like continuations of the hero, not a separate template.
- Use static sections for contrast and performance. Reserve heavy motion for the hero and one or two supporting sections.
- Only escalate when a decision materially changes the asset plan (dark vs light, AI-generated vs brand assets, scroll-tied vs looped playback).

## References

- `references/workflow.md`
- `references/prompt-library.md`
- `references/pressure-scenarios.md`
