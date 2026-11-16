import heroCampusStudy from '../assets/images/hero_campus_study_1794738052901.jpg';
import majorEngineeringIt from '../assets/images/major_engineering_it_1794738053565.jpg';
import majorMedicine from '../assets/images/major_medicine_1794738053023.jpg';
import majorBusiness from '../assets/images/major_business_1794738054159.jpg';
import type { MajorId } from '../types/dirasati';

export const HERO_CAMPUS_IMAGE = heroCampusStudy;

export const MAJOR_COVER_IMAGES: Record<MajorId, string> = {
  engineering: majorEngineeringIt,
  it: majorEngineeringIt,
  sciences: majorEngineeringIt,
  arts: majorEngineeringIt,
  medicine: majorMedicine,
  pharmacy: majorMedicine,
  sports: majorMedicine,
  business: majorBusiness,
  law: majorBusiness,
  education: heroCampusStudy,
  media: heroCampusStudy,
  humanities: heroCampusStudy,
};
