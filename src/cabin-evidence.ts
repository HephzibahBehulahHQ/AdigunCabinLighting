import { CABIN_LAYOUTS, CABIN_PROFILES, type CabinConfig } from './cabin-config.js';

export type CabinEvidenceClassification = 'MANUFACTURER_PLANNING_DATA' | 'DERIVED_FOR_RENDERING' | 'ILLUSTRATIVE_MODEL' | 'USER_EDITED';

export interface CabinEvidenceField {
  readonly field: string;
  readonly value: number | string | readonly number[];
  readonly classification: CabinEvidenceClassification;
  readonly referenceValue?: number | string | readonly number[];
  readonly sourceUrl: string | null;
  readonly sourceRevision: string | null;
  readonly note: string;
}

/** Returns field-level provenance for the selected layout without upgrading estimates into aircraft facts. */
export function buildCabinFieldEvidence(cabin: CabinConfig): readonly CabinEvidenceField[] {
  const profile = CABIN_LAYOUTS[cabin.layoutId];
  const manufacturerReference = 'planningSource' in profile ? profile : null;
  const sourceUrl = manufacturerReference?.planningSource ?? null;
  const sourceRevision = manufacturerReference?.sourceRevision ?? null;
  const evidenceField = (
    field: string,
    value: number | string | readonly number[],
    classification: CabinEvidenceClassification,
    note: string,
    referenceValue?: number | string | readonly number[],
  ): CabinEvidenceField => ({
    field,
    value,
    classification,
    ...(referenceValue === undefined ? {} : { referenceValue }),
    sourceUrl: manufacturerReference && classification !== 'ILLUSTRATIVE_MODEL' ? sourceUrl : null,
    sourceRevision: manufacturerReference && classification !== 'ILLUSTRATIVE_MODEL' ? sourceRevision : null,
    note,
  });
  const configuredFields = [
    ['lengthMeters', cabin.lengthMeters, 'Cabin length'],
    ['widthMeters', cabin.widthMeters, 'Maximum cabin width'],
    ['ceilingHeightMeters', cabin.ceilingHeightMeters, 'Cabin ceiling height'],
    ['seatRows', cabin.seatRows, 'Displayed seat rows'],
    ['seatPitchMeters', cabin.seatPitchMeters, 'Cabin control seat pitch'],
    ['windowCountPerSide', cabin.windowCountPerSide, 'Window count per side'],
    ['overheadBinDepthMeters', cabin.overheadBinDepthMeters, 'Overhead bin depth'],
  ] as const;
  const fieldEvidence: CabinEvidenceField[] = configuredFields.map(([field, value, label]) => {
    const referenceValue = CABIN_PROFILES[cabin.layoutId][field];
    let classification: CabinEvidenceClassification = 'ILLUSTRATIVE_MODEL';
    let note = 'Editable reference value; no aircraft-specific source is recorded.';
    if (manufacturerReference && (field === 'lengthMeters' || field === 'widthMeters')) {
      classification = value === referenceValue ? 'MANUFACTURER_PLANNING_DATA' : 'USER_EDITED';
      note = value === referenceValue
        ? `${label} matches the cited manufacturer planning reference.`
        : `Edited from the cited planning baseline of ${referenceValue}; the current value is user supplied.`;
    } else if (manufacturerReference && field === 'seatPitchMeters') {
      classification = value === referenceValue ? 'DERIVED_FOR_RENDERING' : 'USER_EDITED';
      note = value === referenceValue
        ? 'The single viewer control uses economy pitch as a rendering reference; class-specific published pitches are listed in the seat plan below.'
        : `Edited from the illustrative rendering baseline of ${referenceValue}; class-specific planning pitches remain listed below.`;
    } else if (manufacturerReference && field === 'seatRows') {
      classification = value === referenceValue ? 'DERIVED_FOR_RENDERING' : 'USER_EDITED';
      note = value === referenceValue
        ? 'Displayed row count is derived for the illustrative viewport; it is not a manufacturer row arrangement.'
        : `Edited from the illustrative rendering baseline of ${referenceValue}; the current value is user supplied.`;
    }
    return evidenceField(field, value, classification, note, classification === 'USER_EDITED' ? referenceValue : undefined);
  });
  if ('seatPlan' in profile) {
    fieldEvidence.push(evidenceField('seatCount', profile.seatCount, 'MANUFACTURER_PLANNING_DATA', profile.seatCountBasis));
    const sectionOccurrences = new Map<string, number>();
    for (const section of profile.seatPlan) {
      const sectionIndex = (sectionOccurrences.get(section.cabinClass) ?? 0) + 1;
      sectionOccurrences.set(section.cabinClass, sectionIndex);
      const sectionKey = `${section.cabinClass}[${sectionIndex}]`;
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.seatCount`, section.seatCount, 'MANUFACTURER_PLANNING_DATA',
        'Class seat total from the cited planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.seatsPerRow`, section.groups, 'MANUFACTURER_PLANNING_DATA',
        'Published seat grouping used by the standard planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.pitchMeters`, section.pitchMeters, 'MANUFACTURER_PLANNING_DATA',
        'Class seat pitch from the cited planning example.',
      ));
      fieldEvidence.push(evidenceField(
        `seatPlan.${sectionKey}.displayRows`, section.rows, 'DERIVED_FOR_RENDERING',
        'Row count is arranged by the viewer to represent the published total and is not an OEM cabin layout.',
      ));
    }
  } else {
    fieldEvidence.push(evidenceField('seatGroups', CABIN_LAYOUTS[cabin.layoutId].groups, 'ILLUSTRATIVE_MODEL', 'Generic seat grouping for visual reference; no aircraft-specific plan is recorded.'));
  }
  return fieldEvidence;
}

