import type { GateCode } from "@prisma/client";
import type { DynamicField } from "@/lib/domain/validation";

export const OCOP_PROGRAM = {
  code: "OCOP-DIGITAL-30D",
  name: "Chuyển đổi số OCOP Hải Phòng",
  version: 1,
  title: "Từ dữ liệu sản phẩm đến vận hành số trong 30 ngày",
  description: "Hành trình thực hành trên điện thoại: chuẩn bị dữ liệu, đào tạo, ứng dụng 7 ngày, đồng hành đến ngày 30 và đánh giá.",
} as const;

export const STAGES = [
  { code: "PREPARATION", title: "Chuẩn bị dữ liệu", position: 1 },
  { code: "TRAINING_DAY", title: "Ngày đào tạo", position: 2 },
  { code: "APPLICATION_7D", title: "Ứng dụng 7 ngày", position: 3 },
  { code: "ACCOMPANIMENT_30D", title: "Đồng hành đến ngày 30", position: 4 },
  { code: "EVALUATION", title: "Đánh giá và hướng hỗ trợ", position: 5 },
] as const;

export const EVIDENCE_DEFINITIONS = Array.from({ length: 16 }, (_, index) => {
  const code = `EV${String(index + 1).padStart(2, "0")}`;
  return {
    code,
    title: `Minh chứng ${code}`,
    description: `Minh chứng theo giáo án OCOP cho đầu ra ${code}.`,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeBytes: 4 * 1024 * 1024,
    maxFiles: 3,
  };
});

type TaskSeed = {
  code: string;
  stageCode: string;
  title: string;
  objective: string;
  instructions: string;
  position: number;
  estimateMinutes: number;
  weight: number;
  gateCode: GateCode;
  evidenceCodes: string[];
  fields: DynamicField[];
};

export const TASKS: TaskSeed[] = [
  {
    code: "learner-profile",
    stageCode: "PREPARATION",
    title: "Xác nhận người học và sản phẩm",
    objective: "Khóa một người phụ trách và một sản phẩm đi hết hành trình.",
    instructions: "Nhập đúng thông tin người học, đơn vị, sản phẩm và kênh ưu tiên.",
    position: 1,
    estimateMinutes: 8,
    weight: 5,
    gateCode: "G0",
    evidenceCodes: ["EV01"],
    fields: [
      { key: "learnerName", label: "Họ và tên học viên", kind: "text", minLength: 4 },
      { key: "organizationName", label: "Tên cơ sở hoặc đơn vị", kind: "text", minLength: 4 },
      { key: "productName", label: "Sản phẩm thực hành", kind: "text", minLength: 3 },
      { key: "province", label: "Tỉnh hoặc thành phố", kind: "text", minLength: 3 },
      { key: "primaryChannel", label: "Kênh ưu tiên", kind: "text", minLength: 3 },
    ],
  },
  {
    code: "product-record",
    stageCode: "PREPARATION",
    title: "Lập bản ghi dữ liệu sản phẩm",
    objective: "Tách dữ liệu được phép công khai khỏi phần đang chờ xác thực.",
    instructions: "Chỉ nhập dữ liệu có nguồn; thông tin chưa chắc chắn phải nằm trong trường chờ xác thực.",
    position: 2,
    estimateMinutes: 15,
    weight: 10,
    gateCode: "G0",
    evidenceCodes: ["EV02"],
    fields: [
      { key: "packageSize", label: "Quy cách hoặc dung tích", kind: "text", minLength: 3 },
      { key: "productFacts", label: "Thông tin được phép công khai", kind: "textarea", minLength: 40 },
      { key: "dataSource", label: "Nguồn xác thực dữ liệu", kind: "textarea", minLength: 25 },
      { key: "pendingFacts", label: "Thông tin còn chờ xác thực", kind: "textarea", minLength: 12 },
    ],
  },
  {
    code: "source-rights",
    stageCode: "PREPARATION",
    title: "Kiểm tra ảnh nguồn và quyền sử dụng",
    objective: "Bảo đảm ảnh đúng sản phẩm, còn bản gốc và được phép sử dụng.",
    instructions: "Dùng thư mục ảnh của đơn vị; ảnh AI không được dùng làm bằng chứng nhãn, bao bì hoặc chứng nhận.",
    position: 3,
    estimateMinutes: 10,
    weight: 5,
    gateCode: "G0",
    evidenceCodes: ["EV03"],
    fields: [
      { key: "sourceFolder", label: "Liên kết thư mục ảnh nguồn", kind: "url" },
      { key: "sourceImageCount", label: "Số ảnh nguồn", kind: "number", min: 3 },
      { key: "rightsConfirmed", label: "Ảnh đúng sản phẩm và có quyền sử dụng", kind: "checkbox" },
      { key: "noSyntheticEvidence", label: "Không dùng ảnh AI làm bằng chứng sự thật", kind: "checkbox" },
    ],
  },
  {
    code: "media-kit",
    stageCode: "TRAINING_DAY",
    title: "Khóa dữ liệu và tạo bộ ảnh",
    objective: "Tạo bộ dữ liệu và ảnh truyền thông nhất quán.",
    instructions: "Chốt bản dữ liệu được dùng và mô tả bộ ảnh đã xuất.",
    position: 4,
    estimateMinutes: 25,
    weight: 5,
    gateCode: "G1",
    evidenceCodes: ["EV04", "EV05"],
    fields: [
      { key: "approvedDataSummary", label: "Bản dữ liệu đã khóa", kind: "textarea", minLength: 60 },
      { key: "mediaKit", label: "Danh sách ảnh đã xuất", kind: "textarea", minLength: 35 },
      { key: "mediaQualityConfirmed", label: "Ảnh không méo, không sai nhãn và giữ bản gốc", kind: "checkbox" },
    ],
  },
  {
    code: "channel-content",
    stageCode: "TRAINING_DAY",
    title: "Viết nội dung Facebook và Zalo",
    objective: "Tạo hai nội dung đúng dữ liệu và đúng ngữ cảnh từng kênh.",
    instructions: "Không đưa dữ liệu đang chờ xác thực vào nội dung công khai.",
    position: 5,
    estimateMinutes: 25,
    weight: 10,
    gateCode: "G1",
    evidenceCodes: ["EV06"],
    fields: [
      { key: "facebookPost", label: "Bài Facebook", kind: "textarea", minLength: 80 },
      { key: "zaloPost", label: "Bài Zalo", kind: "textarea", minLength: 60 },
      { key: "contentChecked", label: "Đã kiểm dữ liệu, đối tượng, CTA và lời hứa", kind: "checkbox" },
    ],
  },
  {
    code: "digital-profile",
    stageCode: "TRAINING_DAY",
    title: "Tạo hồ sơ số và QR",
    objective: "Có điểm đến số mở được trên thiết bị khác và đúng dữ liệu đã khóa.",
    instructions: "Kiểm tra URL hoặc QR trên một điện thoại khác trước khi nộp.",
    position: 6,
    estimateMinutes: 15,
    weight: 5,
    gateCode: "G1",
    evidenceCodes: ["EV07"],
    fields: [
      { key: "profileUrl", label: "URL hồ sơ số", kind: "url" },
      { key: "profileSummary", label: "Mô tả trên hồ sơ", kind: "textarea", minLength: 45 },
      { key: "crossDeviceTested", label: "Đã mở URL hoặc QR trên thiết bị khác", kind: "checkbox" },
    ],
  },
  {
    code: "customer-replies",
    stageCode: "TRAINING_DAY",
    title: "Soạn bộ trả lời khách hàng",
    objective: "Có tối thiểu năm tình huống và quy tắc chuyển người phụ trách.",
    instructions: "Không tự suy đoán giá, tồn kho, thành phần hoặc chứng nhận.",
    position: 7,
    estimateMinutes: 20,
    weight: 10,
    gateCode: "G1",
    evidenceCodes: ["EV08"],
    fields: [
      { key: "customerReplies", label: "Năm tình huống và câu trả lời", kind: "textarea", minLength: 120 },
      { key: "escalationRule", label: "Quy tắc chuyển tiếp", kind: "textarea", minLength: 35 },
      { key: "replyCount", label: "Số tình huống đã hoàn thiện", kind: "number", min: 5 },
    ],
  },
  {
    code: "day-seven",
    stageCode: "APPLICATION_7D",
    title: "Dùng thật và tổng kết ngày 7",
    objective: "Có dấu vết dùng thật, chỉ số quan sát và bài học dựa trên dữ liệu.",
    instructions: "Che dữ liệu cá nhân của khách hàng trong mọi minh chứng.",
    position: 8,
    estimateMinutes: 30,
    weight: 20,
    gateCode: "G2",
    evidenceCodes: ["EV09", "EV10"],
    fields: [
      { key: "publishedUrl", label: "URL minh chứng dùng thật", kind: "url" },
      { key: "daySevenMetrics", label: "Chỉ số và phản hồi quan sát", kind: "textarea", minLength: 45 },
      { key: "daySevenLearning", label: "Điều rút ra từ dữ liệu", kind: "textarea", minLength: 30 },
      { key: "privacyChecked", label: "Minh chứng đã che dữ liệu cá nhân", kind: "checkbox" },
    ],
  },
  {
    code: "day-thirty",
    stageCode: "ACCOMPANIMENT_30D",
    title: "Cải tiến và duy trì đến ngày 30",
    objective: "Sửa một điểm từ phản hồi và có ít nhất hai dấu vết duy trì.",
    instructions: "Nêu rõ căn cứ cải tiến, nhật ký D+14/D+21 và nhu cầu hỗ trợ.",
    position: 9,
    estimateMinutes: 30,
    weight: 20,
    gateCode: "G3",
    evidenceCodes: ["EV11", "EV12", "EV13"],
    fields: [
      { key: "improvement", label: "Điểm đã sửa và căn cứ", kind: "textarea", minLength: 50 },
      { key: "maintenanceLog", label: "Nhật ký hai mốc sau ngày 7", kind: "textarea", minLength: 60 },
      { key: "supportNeed", label: "Khó khăn hoặc nhu cầu cụ thể", kind: "textarea", minLength: 35 },
      { key: "maintenanceCount", label: "Số dấu vết duy trì", kind: "number", min: 2 },
    ],
  },
  {
    code: "final-review",
    stageCode: "EVALUATION",
    title: "Tự đánh giá và lập kế hoạch tiếp theo",
    objective: "Đối chiếu năng lực, nhận xét mentor và chốt mục tiêu 30 ngày tiếp theo.",
    instructions: "Mục tiêu phải có người phụ trách và mốc kiểm tra.",
    position: 10,
    estimateMinutes: 20,
    weight: 10,
    gateCode: "G4",
    evidenceCodes: ["EV14", "EV15", "EV16"],
    fields: [
      { key: "selfAssessment", label: "Tự đánh giá có dẫn chứng", kind: "textarea", minLength: 60 },
      { key: "mentorAssessment", label: "Nhận xét mentor", kind: "textarea", minLength: 45 },
      { key: "nextGoal", label: "Mục tiêu 30 ngày tiếp theo", kind: "textarea", minLength: 50 },
      { key: "nextOwner", label: "Người phụ trách", kind: "text", minLength: 4 },
      { key: "nextCheckpoint", label: "Mốc kiểm tra", kind: "text", minLength: 6 },
      { key: "finalTruthConfirmed", label: "Chịu trách nhiệm về dữ liệu và minh chứng đã nộp", kind: "checkbox" },
    ],
  },
];

export const RUBRIC_CRITERIA = [
  ["R-A1", "A", 5, null, ["EV02", "EV04"]], ["R-A2", "A", 5, null, ["EV02", "EV04"]],
  ["R-A3", "A", 5, null, ["EV03"]], ["R-A4", "A", 5, null, ["EV01"]],
  ["R-B1", "B", 6, 2, ["EV04"]], ["R-B2", "B", 5, null, ["EV05"]],
  ["R-B3", "B", 7, null, ["EV06"]], ["R-B4", "B", 6, 2, ["EV07"]], ["R-B5", "B", 6, null, ["EV08"]],
  ["R-C1", "C", 6, 2, ["EV09"]], ["R-C2", "C", 4, 2, ["EV09"]],
  ["R-C3", "C", 4, null, ["EV10"]], ["R-C4", "C", 3, null, ["EV10"]], ["R-C5", "C", 3, null, ["EV10"]],
  ["R-D1", "D", 6, null, ["EV11"]], ["R-D2", "D", 6, 2, ["EV12"]],
  ["R-D3", "D", 4, null, ["EV12"]], ["R-D4", "D", 4, null, ["EV13"]],
  ["R-E1", "E", 3, null, ["EV14"]], ["R-E2", "E", 2, null, ["EV15"]], ["R-E3", "E", 5, 2, ["EV16"]],
].map(([code, groupCode, weight, criticalMinimum, evidenceCodes]) => ({
  code: String(code),
  groupCode: String(groupCode),
  title: `Tiêu chí ${code}`,
  description: `Tiêu chí đánh giá ${code} theo rubric giáo án OCOP.`,
  weight: Number(weight),
  criticalMinimum: criticalMinimum === null ? null : Number(criticalMinimum),
  evidenceCodes: evidenceCodes as string[],
}));

export const QUANG_HAI_PROFILE = {
  learnerName: "Nguyễn Minh Anh",
  organizationName: "Cơ sở Nước mắm Quang Hải — dữ liệu mô phỏng",
  productName: "Nước mắm Quang Hải",
  province: "Hải Phòng",
  primaryChannel: "Zalo và Facebook Page",
};

export const QUANG_HAI_ANSWERS: Record<string, Record<string, unknown>> = {
  "learner-profile": QUANG_HAI_PROFILE,
  "product-record": {
    packageSize: "Chai 500 ml — thông tin mô phỏng",
    productFacts: "Tên sản phẩm thực hành là Nước mắm Quang Hải, quy cách minh họa chai 500 ml và kênh liên hệ ưu tiên là Zalo.",
    dataSource: "Phiếu dữ liệu nội bộ mô phỏng và ảnh nhãn mẫu; phải đối chiếu hồ sơ thật trước khi xuất bản.",
    pendingFacts: "Thành phần, độ đạm, giá, chứng nhận OCOP và chính sách giao hàng: CHỜ XÁC THỰC.",
  },
  "source-rights": {
    sourceFolder: "https://drive.google.com/drive/folders/demo-quang-hai",
    sourceImageCount: 6,
    rightsConfirmed: true,
    noSyntheticEvidence: true,
  },
  "media-kit": {
    approvedDataSummary: "Bản demo chỉ dùng tên Nước mắm Quang Hải, chai 500 ml, khu vực Hải Phòng và kênh Zalo; không dùng dữ liệu đang chờ xác thực.",
    mediaKit: "Một ảnh chính, hai ảnh cận nhãn, một ảnh quy cách và hai ảnh dùng đăng; tất cả giữ bản gốc.",
    mediaQualityConfirmed: true,
  },
  "channel-content": {
    facebookPost: "CASE THỰC HÀNH — Nước mắm Quang Hải, quy cách minh họa chai 500 ml. Đây là nội dung mô phỏng trong chương trình học. Nhắn Zalo để người phụ trách xác nhận dữ liệu và chính sách trước khi đặt.",
    zaloPost: "Bản demo học tập: Nước mắm Quang Hải — chai 500 ml. Anh chị cần thông tin đã xác thực, vui lòng nhắn để người phụ trách kiểm tra trước khi tư vấn.",
    contentChecked: true,
  },
  "digital-profile": {
    profileUrl: "https://www.giftytech.com/onboarding?demo=quang-hai",
    profileSummary: "Hồ sơ số phục vụ kiểm thử giáo trình cho sản phẩm Nước mắm Quang Hải; dữ liệu thương mại phải được cơ sở xác thực.",
    crossDeviceTested: true,
  },
  "customer-replies": {
    customerReplies: "1. Quy cách: xác nhận chai 500 ml. 2. Giá: chuyển người phụ trách. 3. Thành phần: kiểm hồ sơ. 4. Chứng nhận: không suy đoán. 5. Giao hàng: hỏi khu vực nhận và chuyển người phụ trách.",
    escalationRule: "Chuyển người phụ trách khi khách hỏi giá, tồn kho, thành phần, độ đạm, chứng nhận, khiếu nại hoặc giao hàng.",
    replyCount: 5,
  },
  "day-seven": {
    publishedUrl: "https://example.com/quang-hai/ev09",
    daySevenMetrics: "Dữ liệu mô phỏng D+7: 126 lượt xem, 9 lượt tương tác và 4 tin nhắn; 3 người hỏi giá hoặc giao hàng.",
    daySevenLearning: "CTA cần nói rõ người phụ trách sẽ xác nhận giá và giao hàng vì đây là câu hỏi xuất hiện nhiều nhất.",
    privacyChecked: true,
  },
  "day-thirty": {
    improvement: "Đổi CTA để người mua gửi khu vực nhận hàng, dựa trên ba trong bốn câu hỏi quan sát ở ngày thứ bảy.",
    maintenanceLog: "D+14 cập nhật CTA và bộ trả lời. D+21 dùng lại bộ trả lời cho năm hội thoại mô phỏng và ghi nhận câu hỏi cần chuyển tiếp.",
    supportNeed: "Cần chủ cơ sở cung cấp bảng dữ liệu thành phần, độ đạm, giá và phạm vi giao hàng đã duyệt.",
    maintenanceCount: 2,
  },
  "final-review": {
    selfAssessment: "Đã biết tách dữ liệu được phép dùng khỏi phần chờ xác thực, tạo nội dung theo kênh, hồ sơ số và cải tiến CTA từ phản hồi.",
    mentorAssessment: "Quy trình và minh chứng mô phỏng đạt yêu cầu giáo án; cần bổ sung dữ liệu thật trước khi công bố thương mại.",
    nextGoal: "Trong 30 ngày tiếp theo hoàn thiện hồ sơ số dùng thật với dữ liệu được chủ cơ sở duyệt và duy trì hai bài đăng có nhật ký.",
    nextOwner: "Nguyễn Minh Anh",
    nextCheckpoint: "Sau 30 ngày",
    finalTruthConfirmed: true,
  },
};
