export interface SSAParseResult {
  monthlyBenefitAt62: number;
  monthlyBenefitAtFra: number;
  monthlyBenefitAt70: number;
  dateOfBirth?: string;
  importedAt: string;
}

export function parseSSAXml(xmlText: string): SSAParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid XML file. Make sure you uploaded the correct file.");
  }

  // getElementsByTagNameNS("*", localName) matches regardless of namespace prefix
  const getText = (localName: string): string | null => {
    const els = doc.getElementsByTagNameNS("*", localName);
    return els.length > 0 ? (els[0].textContent?.trim() ?? null) : null;
  };

  const parseAmount = (localName: string): number => {
    const text = getText(localName);
    if (!text) return 0;
    return parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
  };

  const at62 = parseAmount("Age62RetirementEstimate");
  const atFra = parseAmount("FullRetirementEstimate");
  const at70 = parseAmount("Age70RetirementEstimate");

  if (at62 === 0 && atFra === 0 && at70 === 0) {
    throw new Error(
      "No benefit estimates found. Make sure you downloaded the XML version of your Social Security statement from ssa.gov/myaccount."
    );
  }

  return {
    monthlyBenefitAt62: at62,
    monthlyBenefitAtFra: atFra,
    monthlyBenefitAt70: at70,
    dateOfBirth: getText("DateOfBirth") ?? undefined,
    importedAt: new Date().toISOString(),
  };
}
