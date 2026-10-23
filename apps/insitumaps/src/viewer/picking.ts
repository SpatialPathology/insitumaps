/**
 * Reads the label under a position straight from the mask store (one chunk
 * of the full-resolution level), independent of the renderer
 */
import * as zarr from "zarrita";

import type { MaskEntry } from "@/insitupy";

const arrays = new WeakMap<
  MaskEntry,
  Promise<zarr.Array<zarr.DataType, zarr.Readable>>
>();

async function openLevel0(
  mask: MaskEntry,
  options?: { signal?: AbortSignal },
): Promise<zarr.Array<zarr.DataType, zarr.Readable>> {
  let promise = arrays.get(mask);
  if (promise === undefined) {
    const source = mask.dataSource.source;
    if (source === undefined || !/^[a-z][a-z0-9+.-]*:/i.test(source)) {
      // TODO workspace (directory) sources: needs the directory handle store
      throw new Error("Cell inspection is only available for URL sources yet.");
    }
    const store = new zarr.FetchStore(source);
    promise = zarr.open.v3(zarr.root(store).resolve("/0"), {
      kind: "array",
      signal: options?.signal,
    });
    promise.catch(() => arrays.delete(mask));
    arrays.set(mask, promise);
  }
  return promise;
}

/**
 * Reads the raster label of a mask at a position
 *
 * @param mask - The mask
 * @param x - X in µm
 * @param y - Y in µm
 * @returns The label (0 for background or outside the mask)
 */
export async function readMaskLabel(
  mask: MaskEntry,
  x: number,
  y: number,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const px = Math.floor(x / mask.pixelSize);
  const py = Math.floor(y / mask.pixelSize);
  if (px < 0 || py < 0 || px >= mask.size.width || py >= mask.size.height) {
    return 0;
  }
  const array = await openLevel0(mask, options);
  const chunk = await zarr.get(
    array,
    [zarr.slice(py, py + 1), zarr.slice(px, px + 1)],
    { signal: options?.signal },
  );
  const value = (chunk.data as ArrayLike<number | bigint>)[0];
  return Number(value ?? 0);
}
