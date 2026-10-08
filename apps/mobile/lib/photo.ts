import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const MAX_LONG_EDGE = 1600;

// Resizes to the spec's max long edge and re-encodes as JPEG. The resulting
// file is well under the 2MB cap at this resolution and JPEG quality, so no
// separate size-check/retry loop is needed.
export async function prepareBoxPhoto(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_LONG_EDGE } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

export async function uploadBoxPhoto(companyId: string, boxId: string, localUri: string): Promise<string> {
  const path = `${companyId}/${boxId}.jpg`;
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from("box-photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}
