import { Bath, BedDouble, Building2, Car, FileCheck2, Ruler, Sofa, UserRound, type LucideIcon } from "lucide-react-native";

// Icons for the listing facts grid, as on the website (ListingDetail.jsx).
export const FACT_ICONS: Record<string, LucideIcon> = {
  type: Building2,
  bedrooms: BedDouble,
  bathrooms: Bath,
  furnishing: Sofa,
  size: Ruler,
  title: FileCheck2,
  parking: Car,
  toilets: Bath,
  lister: UserRound,
};
