// Editorial facts checked against the linked business's own public website.
// This is not a verification badge. Add only sourced facts, keep translations
// equivalent, and advance reviewedAt only after checking the source again.
// Unreviewed listings use their saved description; missing facts stay absent.
const FACTS = {
  "brandupdesignmarketing.com": {
    reviewedAt: "2026-09-12",
    source: "https://www.brandupdesignmarketing.com/",
    summary: {
      en: "BrandUp Design Marketing provides digital advertising, video creative and website design for businesses in Malaysia and Singapore.",
      zh: "BrandUp Design Marketing 为马来西亚与新加坡商家提供数字广告、视频创意制作和网站设计服务。",
    },
    services: { en: ["Facebook & Instagram advertising", "Video production", "Google Ads", "Website design"], zh: ["Facebook 与 Instagram 广告", "视频制作", "Google Ads 广告", "网站设计"] },
    areas: { en: ["Malaysia", "Singapore"], zh: ["马来西亚", "新加坡"] },
  },
  "rakanjayahardware.com": {
    reviewedAt: "2026-09-12",
    source: "https://rakanjayahardware.com/",
    summary: { en: "Rakan Jaya Hardware is a hardware supplier in Kemaman, Terengganu, with building materials, pipe fittings, safety equipment and welding supplies.", zh: "Rakan Jaya Hardware 是位于登嘉楼甘马挽的五金供应商，提供建筑材料、管道配件、安全装备及焊接用品。" },
    services: { en: ["Building materials", "Pipes & fittings", "Personal protective equipment", "Welding equipment"], zh: ["建筑材料", "管道与配件", "个人防护装备", "焊接设备"] },
    location: { en: "Kemaman, Terengganu, Malaysia", zh: "马来西亚登嘉楼甘马挽" },
  },
  "orientalwellness.my": {
    reviewedAt: "2026-09-12",
    source: "https://www.orientalwellness.my/",
    summary: { en: "Oriental Wellness is a massage and wellness business at Plaza Arkadia, Desa ParkCity, Kuala Lumpur. Its website lists foot and body massage, moxibustion and herbal baths.", zh: "中华健康 Oriental Wellness 是位于吉隆坡 Desa ParkCity、Plaza Arkadia 的按摩养生馆，网站列有足部及身体按摩、艾灸和中药浴等项目。" },
    services: { en: ["Foot massage", "Body massage", "Moxibustion", "Herbal baths"], zh: ["足部按摩", "身体按摩", "艾灸", "中药浴"] },
    location: { en: "Plaza Arkadia, Desa ParkCity, Kuala Lumpur", zh: "吉隆坡 Desa ParkCity，Plaza Arkadia" },
  },
  "uscpap.my": {
    reviewedAt: "2026-09-12",
    source: "https://uscpap.my/",
    summary: { en: "USCPAP helps individuals purchase CPAP equipment from US suppliers for delivery to Malaysia. Its website lists ResMed AirSense 10 and AirSense 11, masks and replacement supplies.", zh: "USCPAP 协助个人向美国供应商购买 CPAP 睡眠呼吸设备并运送至马来西亚，网站列有 ResMed AirSense 10、AirSense 11、面罩及更换耗材。" },
    services: { en: ["CPAP purchasing assistance", "CPAP masks & replacement supplies"], zh: ["CPAP 设备代购协助", "CPAP 面罩与更换耗材"] },
    areas: { en: ["Malaysia"], zh: ["马来西亚"] },
  },
};

export function businessFactsFor(identity) {
  return Object.hasOwn(FACTS, identity) ? structuredClone(FACTS[identity]) : null;
}
