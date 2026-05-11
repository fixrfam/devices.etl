import { splitIntoArray } from "./array";
import { parseCardSlot } from "./bool";
import { extractHexCodes, parseColors } from "./colors";
import { parseAnnounced, parseReleasedFromStatus } from "./date";
import { parseDimensions } from "./dimensions";
import { parseDisplayResolution, parseDisplaySizeInches } from "./display";
import { parseWeightGrams } from "./weight";

export function applyTransforms(
	specs: Record<string, string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...specs };

	if (result.announced) {
		result.announced = parseAnnounced(result.announced as string);
	}

	const released = parseReleasedFromStatus(result.status as string);
	if (released) result.released = released;

	const dims = parseDimensions(result.dimensions as string);
	if (dims.width !== null) result.dimensionsWidth = dims.width;
	if (dims.height !== null) result.dimensionsHeight = dims.height;
	if (dims.thickness !== null) result.dimensionsThickness = dims.thickness;

	const grams = parseWeightGrams(result.weight as string);
	if (grams !== null) result.weightGrams = grams;

	const inches = parseDisplaySizeInches(result.displaySize as string);
	if (inches !== null) result.displaySizeInches = inches;

	const res = parseDisplayResolution(result.displayResolution as string);
	if (res.width !== null) result.displayResWidth = res.width;
	if (res.height !== null) result.displayResHeight = res.height;
	if (res.ppi !== null) result.displayResPpi = res.ppi;
	if (res.ratio !== null) result.displaySizeRatio = res.ratio;

	if (result.sim) {
		const parsed = splitIntoArray(result.sim as string, "·");
		if (parsed !== result.sim) result.sim = parsed;
	}

	if (result.internalMemory) {
		const parsed = splitIntoArray(result.internalMemory as string, ", ");
		if (parsed !== result.internalMemory) result.internalMemory = parsed;
	}

	if (result.mainCamera) {
		const parsed = splitIntoArray(result.mainCamera as string, ", ");
		if (parsed !== result.mainCamera) result.mainCamera = parsed;
	}

	if (result.mainCameraFeatures) {
		const parsed = splitIntoArray(result.mainCameraFeatures as string, ", ");
		if (parsed !== result.mainCameraFeatures)
			result.mainCameraFeatures = parsed;
	}

	if (result.networkTech) {
		const parsed = splitIntoArray(result.networkTech as string, " / ");
		if (parsed !== result.networkTech) result.networkTech = parsed;
	}

	if (result.sensors) {
		const parsed = splitIntoArray(result.sensors as string, ", ");
		if (parsed !== result.sensors) result.sensors = parsed;
	}

	if (result.colors) {
		const raw = result.colors as string;
		const parsed = parseColors(raw);
		if (parsed !== raw) result.colors = parsed;
		const hexes = extractHexCodes(raw);
		if (hexes) result.colorsHex = hexes;
	}

	if (result.cardSlot) {
		result.cardSlot = parseCardSlot(result.cardSlot as string);
	}

	return result;
}
