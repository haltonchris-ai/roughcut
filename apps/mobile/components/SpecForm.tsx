import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { BOX_TYPE_LABELS, BOX_TYPES, type BoxSpecInput, type BoxType } from "@roughcut/shared";
import { colors, spacing, typography } from "@/lib/theme";
import { PrimaryButton, OutlineButton, FieldLabel } from "@/lib/ui";
import { prepareBoxPhoto } from "@/lib/photo";

export function SpecForm({
  onSave,
  saving,
}: {
  onSave: (spec: BoxSpecInput, localPhotoUri: string | null) => void;
  saving: boolean;
}) {
  const [boxType, setBoxType] = useState<BoxType>("single_gang");
  const [size, setSize] = useState("");
  const [heightAff, setHeightAff] = useState("");
  const [circuit, setCircuit] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const canSave = size.trim() && heightAff.trim() && circuit.trim();

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const prepared = await prepareBoxPhoto(result.assets[0].uri);
      setPhotoUri(prepared);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View>
        <FieldLabel>Box type</FieldLabel>
        <View style={styles.chipRow}>
          {BOX_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setBoxType(t)}
              style={[styles.chip, boxType === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, boxType === t && styles.chipTextActive]}>{BOX_TYPE_LABELS[t]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <FieldLabel>Size</FieldLabel>
        <TextInput style={styles.input} value={size} onChangeText={setSize} placeholderTextColor={colors.muted} />
      </View>

      <View>
        <FieldLabel>Height above finished floor</FieldLabel>
        <TextInput
          style={styles.input}
          value={heightAff}
          onChangeText={setHeightAff}
          placeholder={'e.g. 18"'}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View>
        <FieldLabel>Circuit</FieldLabel>
        <TextInput style={styles.input} value={circuit} onChangeText={setCircuit} placeholderTextColor={colors.muted} />
      </View>

      <View>
        <FieldLabel>Notes (optional)</FieldLabel>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholderTextColor={colors.muted}
        />
      </View>

      <View>
        <FieldLabel>Photo (optional)</FieldLabel>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <OutlineButton title="Take a photo" onPress={pickPhoto} />
        )}
      </View>

      <PrimaryButton
        title="Save box"
        disabled={!canSave}
        loading={saving}
        onPress={() =>
          onSave(
            {
              job_id: "", // filled in by the caller, which already knows the job
              box_type: boxType,
              size: size.trim(),
              height_aff: heightAff.trim(),
              circuit: circuit.trim(),
              notes: notes.trim() || undefined,
            },
            photoUri
          )
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextActive: { color: colors.bg, fontWeight: "700" },
  photoPreview: { width: 120, height: 120, borderRadius: 8 },
});
