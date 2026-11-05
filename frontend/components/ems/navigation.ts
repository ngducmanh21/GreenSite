import {
  Bell,
  FileBarChart2,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
  UtilityPole,
} from "lucide-react";
export type View =
  "overview" | "scenarios" | "equipment" | "alerts" | "reports" | "assistant";
export const navigation = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "scenarios", label: "Kịch bản năng lượng", icon: SlidersHorizontal },
  { id: "equipment", label: "Nguồn & thiết bị", icon: UtilityPole },
  { id: "alerts", label: "Cảnh báo", icon: Bell },
  { id: "reports", label: "Báo cáo & phát thải", icon: FileBarChart2 },
  { id: "assistant", label: "Trợ lý AI", icon: Sparkles },
] as const;
export const viewTitles: Record<View, [string, string]> = {
  overview: [
    "Một góc nhìn. Toàn bộ năng lượng.",
    "Theo dõi nguồn điện, hiệu quả vận hành và dấu chân carbon của công trường.",
  ],
  scenarios: [
    "Thử phương án trước khi vận hành.",
    "Điều chỉnh nguồn và chính sách để so sánh trên cùng nhu cầu năng lượng.",
  ],
  equipment: [
    "Hiểu từng nguồn năng lượng.",
    "Cấu hình thiết bị trong mô hình và yêu cầu kết nối cho giai đoạn pilot.",
  ],
  alerts: [
    "Nhận diện sớm. Xử lý đúng chỗ.",
    "Các sự kiện được tính từ kịch bản 24 giờ, không phải cảnh báo thiết bị thực.",
  ],
  reports: [
    "Hiệu quả có số liệu đi cùng.",
    "Theo dõi năng lượng, chi phí và phát thải với giả định minh bạch.",
  ],
  assistant: [
    "Có thêm một góc nhìn từ dữ liệu.",
    "Trao đổi với trợ lý về kết quả và các phương án năng lượng của bạn.",
  ],
};
