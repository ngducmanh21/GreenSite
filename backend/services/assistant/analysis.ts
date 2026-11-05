import type { Simulation } from "@greensite/contracts";
import { formatNumber, formatMoney } from "../../common/format.js";
export function localAnalysis(sim: Simulation, question: string): string {
  const {
    optimized: { totals: t },
    config: c,
  } = sim;
  const summary = `Công trường ${sim.site.name} · ${sim.date} · mô phỏng 24 giờ.\n\nChi phí: ${formatMoney(t.cost)}. Điện lưới: ${formatNumber(t.grid, 1)} kWh; PV tiềm năng: ${formatNumber(t.pv, 1)} kWh; diesel: ${formatNumber(t.dieselLiters, 1)} lít.\n`;
  const q = question.toLowerCase();
  let detail = "";
  if (/zero|xuất|ngược/.test(q))
    detail = `\nZero-Export đang ${c.zeroExport ? "bật" : "tắt"}. Xuất ngược: ${formatNumber(t.exported, 1)} kWh; PV hạn chế: ${formatNumber(t.curtailed, 1)} kWh. ${c.zeroExport ? "Mô hình giảm PV dư khi tải và pin không thể hấp thụ." : "Thử bật Zero-Export trong tab Kịch bản để so sánh."} Mô hình 15 phút không chứng minh được đáp ứng quá độ tại PCC; cần nghiệm thu bộ điều khiển cục bộ.`;
  else if (/pin|bess|soc/.test(q))
    detail = `\nPin ${c.batteryKWh} kWh, SOC tối thiểu ${c.reservePct}%. Đã sạc ${formatNumber(t.charge, 1)} kWh và xả ${formatNumber(t.discharge, 1)} kWh. Tồn năng lượng cuối ngày: ${formatNumber(t.finalStored, 1)} kWh (đầu ngày ${formatNumber(t.initialStored, 1)} kWh). Pin không tạo ra điện; chi phí có tính hao mòn ${sim.factors.batteryWear} ₫/kWh xả. Thử chế độ ưu tiên PV để so với sạc điện lưới ban đêm.`;
  else if (/carbon|phát thải|co2|co₂|esg/.test(q))
    detail = `\nPhát thải ước tính ${formatNumber(t.carbon, 1)} kg CO₂e: điện mua ${formatNumber(t.gridCarbon, 1)}, diesel ${formatNumber(t.dieselCarbon, 1)}. Chênh lệch giảm so baseline: ${formatNumber(sim.carbonReduction, 1)} kg CO₂e. Hệ số đang dùng là giả định demo (${sim.factors.grid} kg/kWh và ${sim.factors.diesel} kg/lít), không phải hệ số được xác minh cho hồ sơ ESG.`;
  else
    detail = `\n${sim.savingsPct === null ? "Chưa thể kết luận tiết kiệm: kiểm tra tải thiếu và baseline." : `Chênh lệch chi phí so với cùng nguồn PV nhưng không điều phối pin/dịch tải: ${formatMoney(sim.savings)} (${formatNumber(sim.savingsPct, 1)}%).`} ${t.curtailed > 1 ? "Có PV dư: thử tăng lưu trữ hoặc dịch tải sang 12–15 giờ." : "Thử điều chỉnh dung lượng pin và so sánh chi phí để tránh đầu tư quá mức."} ${c.outage ? "Đang giả lập mất lưới: ưu tiên kiểm tra tải thiếu và dự phòng." : "Bạn có thể bật mất lưới để đánh giá nguồn dự phòng."}`;
  return (
    summary +
    detail +
    "\n\nPhân tích theo quy tắc cục bộ, không phải phản hồi từ mô hình AI. Chỉ đề xuất thử kịch bản; không gửi lệnh điều khiển."
  );
}
