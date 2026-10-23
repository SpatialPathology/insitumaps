# Decisions taken alone

Each entry: the decision, the alternatives, the reasoning. Newest at the bottom.

## D1. Branch names

Decision: develop on `insitumaps/viewer` (brief, section 5) and mirror the same commits to the
session's designated branch `claude/optimistic-ride-gjd8jb`, which the session harness requires.
Alternatives: only one of the two. Reasoning: both instructions are satisfied; the PR is opened
from `insitumaps/viewer`.

## D2. Sandbox install workaround (not committed)

The sandbox proxy blocks `codeload.github.com`, which `pnpm install` needs for the
`@zarrita/storage` fork pinned in `packages/@tissuumaps-storage`. Decision: install locally with a
temporary `overrides` entry pointing at a local clone of the same commit, then restore
`pnpm-workspace.yaml`, `pnpm-lock.yaml` and `package.json`. Nothing of this is committed. Node 22
is used although `engines` asks for 24: typecheck and tests pass. New dependencies of
`apps/insitumaps` are limited to packages already in the lockfile so the committed lockfile stays
consistent.

## D3. App structure: one app, layered folders, no new packages yet

Decision: `apps/insitumaps` holds the InSituPy interface, the v2 implementation, the viewer
mapping and the UI as separate folders with a strict import direction (ui -> state -> viewer ->
insitupy). Alternatives: new workspace packages (`@insitumaps/model`, `@insitumaps/storage`).
Reasoning: packages add build/typedoc/changeset plumbing without benefit while there is one
consumer; the folder boundary keeps a later split mechanical.

## D4. World units are µm

Decision: layer transforms are identity and raster objects carry `scale = pixel_size`, so the
OpenSeadragon world is in µm. Alternatives: pixel world with µm overlays rescaled. Reasoning:
centroids, transcripts and geometries are µm in InSituPy; the scale bar and inspector become
trivial.

## D5. Transcript index as binary + JSON instead of Parquet or Zarr

Decision: `transcripts/insitumaps/points.bin` + `index.json` (see plan, section 5).
Alternatives: (a) gene-sorted Parquet with small row groups and statistics; (b) per-gene zarr
arrays. Reasoning: (a) needs Parquet decoding of row groups in a worker and still reads whole row
groups per tile; (b) needs a variable-length tile index anyway. Raw float32 ranges are the
cheapest to read with HTTP range requests, trivial to write with numpy, and the index is a
single small JSON. The plain Parquet layout stays supported through a slow fallback.

## D6. Picking by reading the mask from zarr, not from the renderer

Decision: on click (and on hover after a short delay) the app converts the cursor to mask pixels
and reads the containing 512 x 512 chunk via zarrita (one range request; chunks are cached).
Alternatives: patch OpenSeadragon/TissUUmaps to expose tile data under the cursor. Reasoning:
independent of renderer internals, works for both masks, small code.

## D7. Outline mode implemented in the labels data transfer (core patch)

Decision: add `labelRenderMode: "fill" | "outline"` to the labels model and compute outlines per
tile in the labels renderer's `transferValues` (a pixel is drawn when a 4-neighbour holds another
label). Alternatives: vector boundaries (not stored by InSituPy), shader-based edge detection
(OSD canvas drawer has no shader stage). Known limitation: a boundary that lies exactly on a tile
seam is not drawn on that seam; documented.
