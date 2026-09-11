import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest edge of the uploaded image — large enough to read a shelf label. */
const FULL_WIDTH = 1600;
const THUMB_WIDTH = 400;

export type Processed = { uri: string; width: number; height: number; thumbUri: string };

/**
 * Shrink a camera photo before it ever touches the network. A raw phone photo is
 * 3–6 MB; this brings it to a few hundred KB and produces the thumbnail the
 * admin gallery uses, so the server needs no native image library.
 */
export async function processPhoto(sourceUri: string): Promise<Processed> {
  const full = await ImageManipulator.manipulate(sourceUri)
    .resize({ width: FULL_WIDTH })
    .renderAsync();
  const saved = await full.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });

  const thumb = await ImageManipulator.manipulate(sourceUri)
    .resize({ width: THUMB_WIDTH })
    .renderAsync();
  const savedThumb = await thumb.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });

  return {
    uri: saved.uri,
    width: saved.width,
    height: saved.height,
    thumbUri: savedThumb.uri,
  };
}
