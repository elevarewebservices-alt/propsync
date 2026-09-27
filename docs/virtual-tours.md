# PropSync Virtual Tour

- Demo: `/tour/demo` (four original AI-generated illustrative photographs).
- Dashboard/editor: `/virtual-tours` (authenticated).
- Public tours: `/tour/{slug}`; existing UUID property tours remain supported.

## Database setup

Apply `supabase/migrations/029_virtual_tours.sql` to the same Supabase project as
PropSync before using the editor. It creates `virtual_tours` and a private
`virtual-tours` storage bucket. Scenes and hotspots live in a validated JSON
document; a revision check prevents concurrent editors overwriting changes.
RLS and revoked client grants require access through the authenticated API.
Published tours expose only selected tour/property fields. Images are served
through a route that checks publication or ownership on each request.

The migration has **not been applied**: Supabase reported the configured project
`ridqxbvnckkhihrdvfkl` as paused. An administrator must restore it, then apply the
migration and verify authenticated create/upload/save/publish/unpublish/delete.

## Checks

```sh
npm run typecheck
npm run test:tours
# With the application running on port 3000:
npm run test:tours:browser
npm run build
```

The 20 validation tests and six browser tests passed during implementation.
Browser coverage uses desktop Chromium, emulated Android Chromium and emulated
iPhone WebKit; this is not physical-device testing. The full repository lint has
pre-existing errors. Production build was interrupted by local disk exhaustion.
Existing database integration scripts could not verify behavior against the
paused database; their success text must not be treated as a passing result.

## Scope and limits

Photos remain flat images with zoom/pan; 360 equirectangular panoramas use the
existing Photo Sphere Viewer and its markers plugin. No 3D reconstruction is
claimed. Future adapters can extend the scene kind and asset model independently.
Tours support up to 40 scenes and 30 hotspots per scene. Uploads are resized in
the browser, decoded/validated on the server, re-encoded to WebP and given a
separate thumbnail. Public image responses deliberately avoid shared caching so
unpublication revokes future requests. Images already downloaded by visitors
cannot be recalled.

The project name is optional text because this module has no separate project
catalog integration. Property details are read from the existing property record.
Form CTAs link to an external HTTPS form. Analytics, automated reconstruction and
cleanup of abandoned/replaced uploads are not implemented. Deleting a tour
attempts to remove its stored assets; failed cleanup leaves inaccessible objects.

## Demo image provenance

`public/tour-demo/*.webp` were generated with the built-in Imagegen tool and
cropped from one original contact sheet. Full images and thumbnails are local;
no third-party photo URLs are used. Exact generation prompt:

> Create one photorealistic real estate demo contact sheet, 2x2 grid with zero borders, each quadrant landscape ratio 3:2, overall image 3:2. Four distinct rooms of the SAME fictional premium Panama coastal apartment: top left airy living room with ivory linen sofa, oak details, large windows and ocean; top right warm minimalist kitchen with travertine island; bottom left peaceful master bedroom with linen bed and oak; bottom right spacious balcony overlooking the ocean with outdoor chairs. Natural daylight, editorial architecture photography, clean perspective, no distortion, no people, no text, no logos. Each quadrant is a complete separate photograph to crop into four website tour demo scene assets. These are illustrative demo images, not a real listing.
