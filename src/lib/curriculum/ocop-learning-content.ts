export type LearningMicroStep = {
  title: string;
  detail: string;
};

export type TaskLearningContent = {
  promise: string;
  whyItMatters: string;
  prepare: string[];
  microSteps: LearningMicroStep[];
  chatgpt: {
    purpose: string;
    prompt: string;
    reminder: string;
  };
  selfCheck: string[];
  commonMistakes: string[];
  mentorCriteria: string[];
  fieldHints: Record<string, string>;
};

export const TASK_LEARNING_CONTENT: Record<string, TaskLearningContent> = {
  "learner-profile": {
    promise: "Chốt đúng một người phụ trách, một sản phẩm thực hành và một kênh ưu tiên.",
    whyItMatters: "Toàn bộ 30 ngày sẽ dùng lại bộ thông tin này. Chốt ngay từ đầu giúp các bài sau không bị lệch tên sản phẩm, đơn vị hoặc người chịu trách nhiệm.",
    prepare: [
      "Tên đầy đủ của người sẽ trực tiếp thực hành trong 30 ngày.",
      "Tên chính thức của cơ sở, hợp tác xã hoặc doanh nghiệp.",
      "Một sản phẩm tiêu biểu có đủ thông tin và ảnh thật để làm mẫu.",
      "Kênh đang dùng thường xuyên nhất: Zalo, Facebook Page hoặc kênh khác.",
    ],
    microSteps: [
      { title: "Chọn một người làm xuyên suốt", detail: "Không chia mỗi bài cho một người khác nhau. Người này chịu trách nhiệm lưu dữ liệu và cập nhật kết quả." },
      { title: "Chọn một sản phẩm tiêu biểu", detail: "Ưu tiên sản phẩm có nhãn, ảnh thật và thông tin nguồn rõ ràng. Chưa cần chọn toàn bộ danh mục." },
      { title: "Ghi đúng tên chính thức", detail: "Đối chiếu tên trên hồ sơ, nhãn hoặc giấy tờ. Không tự rút gọn nếu chưa thống nhất." },
      { title: "Chọn kênh ưu tiên", detail: "Chọn nơi đang có khách hàng thật, không chọn theo xu hướng nếu cơ sở chưa sử dụng." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT sắp xếp thông tin thành một phiếu ngắn và chỉ ra phần còn thiếu.",
      prompt: `Bạn là trợ giảng chuyển đổi số cho chủ thể OCOP. Hãy giúp tôi kiểm tra phiếu thông tin ban đầu.

Thông tin hiện có:
- Người phụ trách: {{learnerName}}
- Cơ sở/đơn vị: {{organizationName}}
- Sản phẩm thực hành: {{productName}}
- Tỉnh/thành phố: {{province}}
- Kênh ưu tiên: {{primaryChannel}}

Yêu cầu:
1. Giữ nguyên dữ liệu tôi cung cấp, không tự đoán hoặc bổ sung.
2. Trình bày lại thành 5 dòng rõ ràng.
3. Nếu mục nào chưa rõ, ghi “CẦN BỔ SUNG” và đặt một câu hỏi ngắn để tôi xác nhận.
4. Cuối cùng cho biết bộ thông tin đã đủ để bắt đầu hay chưa.`,
      reminder: "ChatGPT chỉ giúp sắp xếp. Tên đơn vị và sản phẩm vẫn phải đối chiếu với hồ sơ hoặc nhãn thật.",
    },
    selfCheck: ["Tên người học là người trực tiếp tham gia.", "Tên đơn vị và sản phẩm viết thống nhất với hồ sơ.", "Chỉ chọn một sản phẩm để thực hành.", "Kênh ưu tiên là kênh cơ sở đang dùng thật."],
    commonMistakes: ["Ghi tên gọi tắt thay cho tên chính thức.", "Chọn nhiều sản phẩm nên các bài sau không nhất quán.", "Chọn TikTok hoặc sàn thương mại điện tử dù hiện tại cơ sở chưa vận hành."],
    mentorCriteria: ["Đủ 5 thông tin nền.", "Một người – một sản phẩm – một kênh được xác định rõ.", "Không có thông tin tự suy đoán."],
    fieldHints: {
      learnerName: "Ghi họ tên người trực tiếp học và làm bài, không ghi tên người đăng ký thay.",
      organizationName: "Dùng tên trên giấy đăng ký, hồ sơ OCOP hoặc tên thương hiệu đã được đơn vị thống nhất.",
      productName: "Chỉ chọn một sản phẩm tiêu biểu cho toàn bộ hành trình.",
      province: "Ví dụ: Hải Phòng.",
      primaryChannel: "Ví dụ: Zalo cá nhân, Facebook Page hoặc cửa hàng trực tiếp.",
    },
  },
  "product-record": {
    promise: "Tạo một bản dữ liệu sản phẩm dùng chung, tách rõ điều đã xác thực và điều còn chờ xác nhận.",
    whyItMatters: "AI có thể viết rất nhanh nhưng cũng có thể làm sai. Bản ghi này là nguồn sự thật để mọi nội dung, hồ sơ số và câu trả lời khách hàng không bị bịa thêm.",
    prepare: ["Ảnh mặt trước và mặt sau của nhãn.", "Hồ sơ hoặc phiếu thông tin sản phẩm đang sử dụng.", "Quy cách đóng gói, dung tích hoặc khối lượng.", "Người có quyền xác nhận giá, thành phần, chứng nhận và phạm vi giao hàng."],
    microSteps: [
      { title: "Chép dữ liệu từ nguồn thật", detail: "Ưu tiên nhãn, hồ sơ công bố, chứng nhận hoặc tài liệu nội bộ đã được duyệt." },
      { title: "Tách thông tin được phép công khai", detail: "Chỉ đưa ra ngoài những gì đã có căn cứ và được chủ cơ sở đồng ý." },
      { title: "Đưa phần chưa chắc vào danh sách chờ", detail: "Giá, tồn kho, thành phần, chứng nhận hoặc chính sách giao hàng chưa rõ phải ghi CHỜ XÁC THỰC." },
      { title: "Ghi lại nguồn", detail: "Mỗi nhóm thông tin phải biết lấy từ đâu và ai có thể xác nhận." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT phân loại dữ liệu, tuyệt đối không yêu cầu AI tự viết thêm thông tin sản phẩm.",
      prompt: `Bạn là biên tập viên dữ liệu sản phẩm OCOP. Hãy phân loại thông tin tôi cung cấp thành 3 nhóm.

Dữ liệu thô:
{{draftData}}

Ba nhóm cần trả về:
A. ĐÃ CÓ NGUỒN – có thể dùng để viết nội dung.
B. CHỜ XÁC THỰC – cần hỏi lại chủ cơ sở hoặc đối chiếu hồ sơ.
C. CÂU HỎI CẦN XÁC NHẬN – viết thành câu hỏi ngắn, dễ trả lời.

Quy tắc bắt buộc:
- Không tự thêm thành phần, công dụng, chứng nhận, giá, hạn sử dụng hoặc chính sách giao hàng.
- Không biến thông tin suy đoán thành sự thật.
- Nếu dữ liệu không đủ, nói rõ “CHƯA ĐỦ DỮ LIỆU”.`,
      reminder: "Không sao chép nguyên câu trả lời của AI để công bố. Hãy đối chiếu lại từng ý với nguồn thật.",
    },
    selfCheck: ["Quy cách sản phẩm khớp với nhãn.", "Nội dung công khai không chứa dữ liệu đang chờ xác thực.", "Có ghi rõ nguồn kiểm tra.", "Giá, thành phần, chứng nhận và công dụng không bị AI tự thêm."],
    commonMistakes: ["Để ChatGPT tự mô tả hương vị, công dụng hoặc tiêu chuẩn.", "Dùng một bài đăng cũ làm nguồn duy nhất.", "Không ghi người chịu trách nhiệm xác nhận thông tin thay đổi thường xuyên."],
    mentorCriteria: ["Thông tin công khai và thông tin chờ xác thực được tách rõ.", "Có nguồn dữ liệu cụ thể.", "Không có lời hứa hoặc tuyên bố vượt quá bằng chứng."],
    fieldHints: {
      packageSize: "Chép đúng dung tích/khối lượng và quy cách ghi trên nhãn.",
      productFacts: "Mỗi ý nên là một sự thật ngắn, có thể đối chiếu.",
      dataSource: "Ghi tên hồ sơ, ảnh nhãn hoặc người đã xác nhận và ngày kiểm tra.",
      pendingFacts: "Liệt kê thẳng những gì chưa chắc; không cần cố điền cho đủ.",
    },
  },
  "source-rights": {
    promise: "Có một thư mục ảnh thật, rõ nguồn và được phép sử dụng.",
    whyItMatters: "Ảnh là bằng chứng trực quan. Ảnh AI hoặc ảnh tải trên mạng không thể thay cho nhãn, bao bì, chứng nhận và sản phẩm thật của cơ sở.",
    prepare: ["Điện thoại có ảnh gốc của sản phẩm.", "Quyền truy cập Google Drive hoặc thư mục ảnh chung.", "Xác nhận của chủ cơ sở về quyền sử dụng ảnh.", "Ít nhất ba góc ảnh: toàn sản phẩm, mặt nhãn và chi tiết quan trọng."],
    microSteps: [
      { title: "Tạo một thư mục riêng", detail: "Đặt tên theo mẫu: Tên cơ sở – Tên sản phẩm – Ảnh nguồn." },
      { title: "Giữ lại ảnh gốc", detail: "Không xóa ảnh gốc sau khi chỉnh sáng, cắt nền hoặc thêm chữ." },
      { title: "Loại ảnh không đáng tin", detail: "Không dùng ảnh lấy từ cơ sở khác, ảnh mạng hoặc ảnh AI làm minh chứng sự thật." },
      { title: "Kiểm tra quyền sử dụng", detail: "Xác nhận ảnh do cơ sở chụp, thuê chụp hoặc đã được cho phép sử dụng." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT tạo checklist đặt tên và sắp xếp ảnh; không dùng AI để tạo bằng chứng thay ảnh thật.",
      prompt: `Hãy tạo cho tôi một checklist rất ngắn để kiểm tra thư mục ảnh nguồn của sản phẩm {{productName}}.

Checklist phải kiểm tra:
- Có ảnh toàn sản phẩm, mặt trước nhãn, mặt sau nhãn và quy cách.
- Ảnh còn bản gốc.
- Biết người chụp hoặc nguồn ảnh.
- Có quyền sử dụng.
- Không dùng ảnh AI để chứng minh nhãn, bao bì, chứng nhận hoặc đặc điểm thật.

Trả lời bằng các ô kiểm đơn giản, không viết thêm thông tin về sản phẩm.`,
      reminder: "AI chỉ tạo checklist. Minh chứng bắt buộc phải là ảnh thật do cơ sở cung cấp hoặc có quyền sử dụng.",
    },
    selfCheck: ["Có ít nhất ba ảnh nguồn.", "Liên kết thư mục mở được trên thiết bị khác.", "Còn giữ ảnh gốc.", "Đã xác nhận quyền sử dụng.", "Không dùng ảnh AI làm bằng chứng."],
    commonMistakes: ["Chỉ giữ ảnh đã chèn chữ, không còn bản gốc.", "Gửi liên kết Drive nhưng mentor không có quyền xem.", "Lấy ảnh trên Facebook rồi không biết ai là chủ sở hữu."],
    mentorCriteria: ["Thư mục truy cập được.", "Ảnh đúng sản phẩm và đủ góc cơ bản.", "Quyền sử dụng được xác nhận.", "Không có bằng chứng tổng hợp bằng AI."],
    fieldHints: {
      sourceFolder: "Dán liên kết thư mục Drive và thử mở ở chế độ ẩn danh hoặc điện thoại khác.",
      sourceImageCount: "Đếm số ảnh gốc thực sự dùng được.",
      rightsConfirmed: "Chỉ đánh dấu khi cơ sở có quyền dùng các ảnh này.",
      noSyntheticEvidence: "Ảnh AI có thể dùng minh họa sáng tạo, không dùng làm bằng chứng sự thật.",
    },
  },
  "media-kit": {
    promise: "Có một bộ ảnh thống nhất, dùng được ngay cho bài đăng và hồ sơ số.",
    whyItMatters: "Một bộ ảnh gọn và nhất quán giúp cơ sở sử dụng lại nhiều lần, thay vì mỗi lần đăng lại đi tìm hoặc chỉnh ảnh từ đầu.",
    prepare: ["Bản dữ liệu sản phẩm đã được xác thực.", "Thư mục ảnh nguồn đã đạt.", "Ứng dụng chỉnh ảnh quen dùng trên điện thoại.", "Kích thước ảnh phù hợp với kênh ưu tiên."],
    microSteps: [
      { title: "Chọn ảnh chính", detail: "Ảnh rõ sản phẩm, không méo nhãn và có khoảng trống vừa đủ." },
      { title: "Chọn các ảnh bổ trợ", detail: "Ưu tiên mặt nhãn, quy cách và bối cảnh sử dụng thật." },
      { title: "Chỉnh vừa đủ", detail: "Chỉ chỉnh sáng, cắt khung, cân màu; không làm thay đổi nhãn hoặc hình dáng sản phẩm." },
      { title: "Xuất và đặt tên", detail: "Đặt tên dễ tìm, ví dụ: quang-hai-500ml-anh-chinh.jpg." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT đề xuất danh sách góc ảnh cần có dựa trên mục tiêu truyền thông, không tạo ảnh sản phẩm giả.",
      prompt: `Tôi đang chuẩn bị bộ ảnh truyền thông cho {{productName}}.

Dữ liệu đã xác thực:
{{approvedFacts}}

Hãy đề xuất một danh sách 6 ảnh cần có gồm:
1 ảnh chính, 2 ảnh nhãn/chi tiết, 1 ảnh quy cách và 2 ảnh dùng cho bài đăng.

Với mỗi ảnh, ghi: mục đích, bố cục đơn giản, chi tiết phải nhìn rõ và lỗi cần tránh.
Không thêm đặc điểm sản phẩm chưa có trong dữ liệu. Không đề nghị dùng ảnh AI thay cho sản phẩm thật.`,
      reminder: "Dùng gợi ý của ChatGPT như danh sách chụp. Ảnh cuối cùng vẫn phải dựa trên sản phẩm và nhãn thật.",
    },
    selfCheck: ["Ảnh chính nhìn rõ sản phẩm.", "Nhãn không bị méo hoặc bị AI thay đổi.", "Có ảnh gốc để đối chiếu.", "Tên tệp dễ hiểu.", "Bộ ảnh mở được trên điện thoại khác."],
    commonMistakes: ["Dùng bộ lọc quá mạnh làm sai màu sản phẩm.", "Xóa nền làm mất chi tiết cạnh chai/hộp.", "Chèn quá nhiều chữ nhỏ vào ảnh."],
    mentorCriteria: ["Bộ ảnh đủ vai trò sử dụng.", "Không làm sai nhãn hoặc hình dáng.", "Chất lượng đủ đọc trên điện thoại.", "Còn nguồn gốc đối chiếu."],
    fieldHints: {
      approvedDataSummary: "Tóm tắt đúng những dữ liệu được phép dùng khi thiết kế ảnh.",
      mediaKit: "Liệt kê tên hoặc vai trò của từng ảnh đã xuất.",
      mediaQualityConfirmed: "Mở từng ảnh ở kích thước lớn trước khi xác nhận.",
    },
  },
  "channel-content": {
    promise: "Có một bài Facebook và một tin Zalo đúng dữ liệu, dễ đọc và có lời kêu gọi rõ ràng.",
    whyItMatters: "Cùng một sản phẩm nhưng người đọc Facebook và người nhận Zalo có ngữ cảnh khác nhau. Nội dung cần phù hợp từng kênh, không chỉ sao chép nguyên văn.",
    prepare: ["Bản dữ liệu đã khóa.", "Một ảnh chính đã đạt.", "Đối tượng khách hàng muốn tiếp cận.", "Hành động mong muốn: nhắn tin, gọi điện, xem hồ sơ số hoặc tới cửa hàng."],
    microSteps: [
      { title: "Chọn một thông điệp chính", detail: "Một bài chỉ nên tập trung vào một lý do để người đọc quan tâm." },
      { title: "Viết bản Facebook", detail: "Có mở bài, thông tin sản phẩm đã xác thực và lời kêu gọi hành động." },
      { title: "Rút gọn cho Zalo", detail: "Viết gần gũi, trực tiếp và ngắn hơn; tránh đoạn văn dài." },
      { title: "Soát sự thật", detail: "Xóa mọi giá, công dụng, chứng nhận hoặc lời hứa chưa được xác nhận." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT viết hai bản nháp theo dữ liệu đã khóa và bắt buộc tự kiểm tra rủi ro bịa thông tin.",
      prompt: `Bạn là người hỗ trợ viết nội dung cho một chủ thể OCOP.

Sản phẩm: {{productName}}
Dữ liệu ĐÃ XÁC THỰC được phép dùng:
{{approvedFacts}}
Khách hàng chính: {{audience}}
Hành động mong muốn: {{callToAction}}

Hãy viết:
A. Một bài Facebook dễ đọc, khoảng 120–180 từ.
B. Một tin Zalo ngắn, khoảng 50–80 từ.

Quy tắc:
- Chỉ dùng dữ liệu đã xác thực.
- Không tự thêm công dụng, chứng nhận, giải thưởng, thành phần, giá hoặc chính sách giao hàng.
- Nếu thiếu dữ liệu quan trọng, đặt [CẦN XÁC NHẬN] thay vì đoán.
- Cuối câu trả lời, liệt kê những câu nào tôi cần kiểm tra lại trước khi đăng.`,
      reminder: "Trước khi đăng, đọc thành tiếng một lần và đối chiếu từng thông tin với bản dữ liệu sản phẩm.",
    },
    selfCheck: ["Facebook và Zalo không giống hệt nhau.", "Không có thông tin chờ xác thực.", "Có một lời kêu gọi hành động rõ.", "Không hứa quá mức.", "Câu chữ dễ hiểu với khách hàng thông thường."],
    commonMistakes: ["Dùng quá nhiều tính từ như tốt nhất, số một, tuyệt đối.", "Đưa giá hoặc ưu đãi cũ vào bài mới.", "Đăng nguyên văn câu trả lời của AI mà không kiểm tra."],
    mentorCriteria: ["Nội dung đúng nguồn.", "Phù hợp từng kênh.", "CTA rõ và thực hiện được.", "Không có tuyên bố rủi ro hoặc chưa được chứng minh."],
    fieldHints: {
      facebookPost: "Viết thành các đoạn ngắn; mỗi đoạn 1–2 câu để dễ đọc trên điện thoại.",
      zaloPost: "Ưu tiên câu ngắn, giọng gần gũi và một hành động cụ thể.",
      contentChecked: "Đọc lại toàn bài và đánh dấu sau khi đã đối chiếu nguồn.",
    },
  },
  "digital-profile": {
    promise: "Có một đường dẫn hoặc mã QR mở được trên máy khác và hiển thị đúng dữ liệu sản phẩm.",
    whyItMatters: "Hồ sơ số là điểm đến chung cho khách hàng. Nếu đường dẫn hỏng hoặc dữ liệu sai, mọi bài đăng và mã QR đều mất tác dụng.",
    prepare: ["Dữ liệu và ảnh đã duyệt.", "Đường dẫn trang hồ sơ số.", "Một điện thoại khác để kiểm tra.", "Mã QR đã tạo từ đúng đường dẫn."],
    microSteps: [
      { title: "Điền dữ liệu đã duyệt", detail: "Dùng đúng tên, ảnh và thông tin từ hai bước chuẩn hóa trước." },
      { title: "Tạo hoặc cập nhật mã QR", detail: "Mã QR phải dẫn thẳng tới hồ sơ, không qua đường dẫn khó hiểu hoặc đã hết hạn." },
      { title: "Mở bằng thiết bị khác", detail: "Dùng 4G hoặc tài khoản khác để phát hiện lỗi quyền truy cập." },
      { title: "Soát màn hình điện thoại", detail: "Tên, ảnh, nút liên hệ và nội dung chính phải nhìn rõ mà không cần phóng to." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT rút gọn phần giới thiệu hồ sơ số từ dữ liệu đã xác thực.",
      prompt: `Hãy viết phần giới thiệu ngắn cho hồ sơ số của {{productName}}.

Dữ liệu được phép dùng:
{{approvedFacts}}

Yêu cầu:
- 60–90 từ, câu ngắn và dễ hiểu.
- Nêu sản phẩm là gì, thuộc cơ sở nào và khách hàng liên hệ bằng cách nào.
- Không thêm công dụng, thành phần, chứng nhận, giá hoặc lời hứa chưa có nguồn.
- Nếu thiếu thông tin liên hệ, ghi [BỔ SUNG LIÊN HỆ].
- Sau phần giới thiệu, đưa checklist 4 mục để tôi kiểm tra hồ sơ trên điện thoại.`,
      reminder: "Mã QR chỉ chứng minh đường dẫn hoạt động, không tự chứng minh nội dung bên trong là đúng.",
    },
    selfCheck: ["URL mở được không cần xin quyền.", "QR mở đúng URL.", "Tên và ảnh sản phẩm đúng.", "Nút liên hệ hoạt động.", "Đã thử trên thiết bị khác."],
    commonMistakes: ["Dán liên kết chỉ chủ tài khoản mới mở được.", "Tạo QR trước rồi thay đổi URL.", "Trang hồ sơ có quá nhiều chữ nhỏ."],
    mentorCriteria: ["Hồ sơ mở công khai theo phạm vi đã đồng ý.", "Dữ liệu khớp bản đã duyệt.", "QR và nút liên hệ hoạt động trên thiết bị khác."],
    fieldHints: {
      profileUrl: "Dán đường dẫn cuối cùng mà khách hàng sẽ mở.",
      profileSummary: "Tóm tắt những gì đang hiển thị, không viết thông tin mới.",
      crossDeviceTested: "Chỉ xác nhận sau khi mở thử bằng máy hoặc mạng khác.",
    },
  },
  "customer-replies": {
    promise: "Có bộ trả lời cho ít nhất năm tình huống thường gặp và biết khi nào phải chuyển người phụ trách.",
    whyItMatters: "Trả lời nhanh nhưng sai giá, thành phần hoặc chính sách có thể gây mất niềm tin. Bộ mẫu giúp trả lời nhất quán mà không bịa.",
    prepare: ["Các câu hỏi khách thường hỏi.", "Thông tin nào nhân viên được phép trả lời.", "Tên hoặc kênh của người chịu trách nhiệm.", "Các tình huống phải chuyển tiếp: giá, tồn kho, khiếu nại, chứng nhận hoặc giao hàng."],
    microSteps: [
      { title: "Liệt kê câu hỏi thật", detail: "Ưu tiên câu đã xuất hiện trong Zalo, Facebook hoặc tại cửa hàng." },
      { title: "Viết câu trả lời ngắn", detail: "Trả lời phần đã biết và nói rõ phần cần kiểm tra." },
      { title: "Đặt quy tắc chuyển tiếp", detail: "Nêu tình huống, người nhận và thời gian dự kiến phản hồi." },
      { title: "Đọc thử như khách hàng", detail: "Câu trả lời phải lịch sự, rõ ràng và không làm khách hiểu nhầm rằng AI đã xác nhận." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT soạn câu trả lời có giới hạn và luôn chuyển tiếp khi thiếu dữ liệu.",
      prompt: `Bạn là trợ lý soạn mẫu trả lời khách hàng cho {{productName}}.

Dữ liệu đã xác thực:
{{approvedFacts}}
Thông tin chưa được tự trả lời:
{{restrictedFacts}}
Người/kênh chuyển tiếp: {{escalationContact}}

Hãy soạn 5 tình huống: hỏi quy cách, hỏi giá, hỏi thành phần/chứng nhận, hỏi giao hàng và phản ánh chất lượng.
Mỗi tình huống gồm:
1. Câu hỏi của khách.
2. Câu trả lời ngắn, lịch sự.
3. Khi nào phải chuyển người phụ trách.

Không tự đoán giá, tồn kho, thành phần, chứng nhận hoặc phạm vi giao hàng.`,
      reminder: "Bộ trả lời là khuôn hỗ trợ. Thông tin thay đổi như giá và tồn kho vẫn phải kiểm tra tại thời điểm trả lời.",
    },
    selfCheck: ["Có ít nhất năm tình huống.", "Không tự trả lời thông tin bị giới hạn.", "Có người hoặc kênh chuyển tiếp.", "Có thời gian phản hồi dự kiến.", "Giọng điệu lịch sự và ngắn."],
    commonMistakes: ["Để AI tự báo giá hoặc tồn kho.", "Viết câu trả lời quá dài như bài quảng cáo.", "Nói 'sẽ liên hệ lại' nhưng không ghi ai phụ trách."],
    mentorCriteria: ["Đủ nhóm tình huống cốt lõi.", "Quy tắc chuyển tiếp rõ.", "Không có câu trả lời vượt quyền hoặc thiếu nguồn."],
    fieldHints: {
      customerReplies: "Đánh số từng tình huống để dễ sao chép khi trả lời khách.",
      escalationRule: "Ghi rõ câu hỏi nào phải chuyển, chuyển cho ai và dự kiến bao lâu có phản hồi.",
      replyCount: "Đếm số tình huống đã hoàn thiện, không đếm số câu trong một tình huống.",
    },
  },
  "day-seven": {
    promise: "Có bằng chứng đã sử dụng thật và một kết luận ngày 7 dựa trên số liệu quan sát được.",
    whyItMatters: "Mục tiêu không phải tạo một bài đẹp rồi để đó. Dữ liệu 7 ngày cho biết nội dung có được dùng, khách quan tâm điều gì và cần sửa điểm nào.",
    prepare: ["URL bài đăng hoặc ảnh chụp đã che thông tin cá nhân.", "Lượt tiếp cận/xem, tương tác và tin nhắn nếu kênh có cung cấp.", "Các câu hỏi hoặc phản hồi xuất hiện.", "Mốc thời gian đủ 7 ngày hoặc ghi rõ thời gian thực tế."],
    microSteps: [
      { title: "Dùng nội dung trên kênh thật", detail: "Đăng hoặc gửi trên kênh đã chọn, không chỉ lưu bản nháp." },
      { title: "Ghi số liệu cùng thời điểm", detail: "Chụp hoặc ghi lại ngày đo để số liệu có ý nghĩa." },
      { title: "Nhóm phản hồi", detail: "Tách câu hỏi về giá, giao hàng, quy cách, chất lượng hoặc thông tin khác." },
      { title: "Rút một bài học có căn cứ", detail: "Nêu rõ dữ liệu nào dẫn tới kết luận, tránh nhận xét chung chung như 'khách rất thích'." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT phân tích số liệu nhỏ và phản hồi, không thổi phồng thành hiệu quả kinh doanh.",
      prompt: `Hãy giúp tôi tổng kết 7 ngày sử dụng nội dung cho {{productName}}.

Số liệu quan sát được:
{{metrics}}
Phản hồi/câu hỏi của khách:
{{feedback}}

Trả về 4 phần:
1. Những gì dữ liệu thực sự cho thấy.
2. Điều chưa thể kết luận vì thiếu dữ liệu.
3. Ba câu hỏi xuất hiện nhiều hoặc quan trọng nhất.
4. Một thay đổi nhỏ nên thử trong tuần tiếp theo và lý do.

Không gọi lượt xem là doanh số. Không suy đoán người mua hoặc hiệu quả nếu chưa có số liệu.`,
      reminder: "Che tên, số điện thoại, địa chỉ và ảnh đại diện của khách trước khi tải minh chứng.",
    },
    selfCheck: ["Có URL hoặc ảnh dùng thật.", "Số liệu có mốc thời gian.", "Dữ liệu cá nhân đã được che.", "Bài học dẫn từ dữ liệu cụ thể.", "Không biến tương tác thành doanh số nếu chưa có bằng chứng."],
    commonMistakes: ["Chụp màn hình để lộ thông tin khách.", "Chỉ ghi lượt xem mà không ghi câu hỏi hoặc hành động.", "Kết luận thành công chỉ từ một chỉ số."],
    mentorCriteria: ["Có dấu vết sử dụng thật.", "Minh chứng an toàn dữ liệu cá nhân.", "Kết luận có căn cứ và chỉ ra một cải tiến cụ thể."],
    fieldHints: {
      publishedUrl: "Dán URL công khai; nếu không có URL, minh chứng ảnh vẫn phải được tải ở bước sau.",
      daySevenMetrics: "Ghi ngày đo và từng chỉ số; nếu kênh không có chỉ số, ghi rõ.",
      daySevenLearning: "Viết theo mẫu: Vì thấy… nên tôi sẽ…",
      privacyChecked: "Kiểm tra kỹ tên, số điện thoại, địa chỉ và ảnh đại diện của khách.",
    },
  },
  "day-thirty": {
    promise: "Chứng minh đã sửa ít nhất một điểm và duy trì hoạt động sau ngày thứ 7.",
    whyItMatters: "Chuyển đổi số chỉ có giá trị khi trở thành thói quen. Nhật ký ngắn giúp phân biệt việc dùng thật với kết quả chỉ có trong ngày đào tạo.",
    prepare: ["Bài học ngày 7.", "Một thay đổi đã thực hiện.", "Dấu vết hoạt động ở ít nhất hai mốc sau ngày 7.", "Khó khăn hoặc nhu cầu hỗ trợ còn tồn tại."],
    microSteps: [
      { title: "Chọn một điểm cần sửa", detail: "Ưu tiên thay đổi nhỏ có thể làm ngay: CTA, ảnh chính, câu trả lời hoặc dữ liệu hồ sơ." },
      { title: "Ghi căn cứ", detail: "Nêu phản hồi hoặc số liệu nào khiến cơ sở quyết định sửa." },
      { title: "Ghi nhật ký hai mốc", detail: "Mỗi mốc chỉ cần: đã làm gì, kết quả quan sát, vấn đề mới." },
      { title: "Nêu nhu cầu cụ thể", detail: "Thay 'cần hỗ trợ thêm' bằng một việc rõ: xác minh dữ liệu, chụp ảnh, vận hành kênh hoặc chăm sóc khách." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT biến ghi chú rời rạc thành nhật ký, nhưng giữ nguyên sự kiện và số liệu thật.",
      prompt: `Hãy sắp xếp nhật ký duy trì 30 ngày cho {{productName}}.

Bài học ngày 7: {{daySevenLearning}}
Các việc đã làm sau đó: {{maintenanceNotes}}
Khó khăn còn lại: {{supportNeed}}

Trình bày thành:
1. Điểm đã thay đổi và căn cứ.
2. Nhật ký mốc 1: việc làm – kết quả – vấn đề.
3. Nhật ký mốc 2: việc làm – kết quả – vấn đề.
4. Một nhu cầu hỗ trợ cụ thể, có người cần phối hợp.

Không tạo thêm hoạt động, số liệu hoặc kết quả không có trong ghi chú.`,
      reminder: "Nếu bỏ lỡ một mốc, hãy ghi đúng là chưa thực hiện và nêu lý do; không nhờ AI tạo nhật ký giả.",
    },
    selfCheck: ["Có ít nhất một cải tiến.", "Cải tiến có căn cứ từ ngày 7 hoặc phản hồi thật.", "Có hai dấu vết duy trì.", "Nhật ký không bịa hoạt động.", "Nhu cầu hỗ trợ đủ cụ thể để phân công."],
    commonMistakes: ["Viết nhật ký một lần vào cuối kỳ và không có dấu vết.", "Nói đã cải tiến nhưng không nêu điểm trước/sau.", "Nhu cầu hỗ trợ quá chung chung."],
    mentorCriteria: ["Có thay đổi thật và căn cứ.", "Có hai mốc duy trì.", "Nhu cầu hỗ trợ được phân loại rõ."],
    fieldHints: {
      improvement: "Nêu điểm trước, điểm đã sửa và bằng chứng khiến bạn quyết định sửa.",
      maintenanceLog: "Mỗi mốc ghi ngày, việc đã làm và điều quan sát được.",
      supportNeed: "Nêu một việc cụ thể và ai cần tham gia hỗ trợ.",
      maintenanceCount: "Số mốc có hoạt động và bằng chứng, tối thiểu hai.",
    },
  },
  "final-review": {
    promise: "Tổng kết đúng năng lực đã hình thành và chốt một mục tiêu 30 ngày tiếp theo có người phụ trách.",
    whyItMatters: "Chứng chỉ chỉ có ý nghĩa khi gắn với sản phẩm đầu ra và khả năng tiếp tục vận hành. Bước này giúp chương trình xác định đúng nhu cầu hỗ trợ thay vì đầu tư dàn trải.",
    prepare: ["Tất cả bài đã được mentor xác minh.", "Bài học ngày 7 và nhật ký ngày 30.", "Nhận xét của mentor.", "Một mục tiêu thực tế trong 30 ngày tiếp theo."],
    microSteps: [
      { title: "Đối chiếu sản phẩm đã làm", detail: "Nêu năng lực dựa trên dữ liệu, bài đăng, hồ sơ số, bộ trả lời và nhật ký thật." },
      { title: "Ghi điều còn yếu", detail: "Không cần tự đánh giá hoàn hảo; điểm nghẽn rõ sẽ giúp nhận hỗ trợ đúng." },
      { title: "Đọc và phản hồi nhận xét mentor", detail: "Xác nhận phần đồng ý, phần cần làm rõ và hành động tiếp theo." },
      { title: "Chốt mục tiêu mới", detail: "Mục tiêu cần có kết quả, người phụ trách và ngày kiểm tra." },
    ],
    chatgpt: {
      purpose: "Nhờ ChatGPT cấu trúc bản tự đánh giá dựa trên bằng chứng, không viết thành lời khen chung chung.",
      prompt: `Hãy giúp tôi viết bản tự đánh giá cuối chương trình cho {{productName}} dựa trên các bằng chứng dưới đây.

Những đầu ra đã hoàn thành: {{completedOutputs}}
Bài học ngày 7: {{daySevenLearning}}
Kết quả duy trì ngày 30: {{dayThirtyResult}}
Nhận xét mentor: {{mentorFeedback}}

Trả về:
1. Ba việc tôi đã tự làm được, mỗi việc kèm một bằng chứng.
2. Hai điểm tôi còn cần hỗ trợ.
3. Một mục tiêu 30 ngày tiếp theo theo mẫu: kết quả – người phụ trách – ngày kiểm tra.
4. Một đoạn cam kết ngắn rằng dữ liệu và minh chứng đã nộp là đúng thực tế.

Không thêm thành tích, doanh số hoặc hoạt động không có trong bằng chứng.`,
      reminder: "Bản tự đánh giá tốt không cần nói mọi thứ đều thành công; cần trung thực và chỉ ra được bước tiếp theo.",
    },
    selfCheck: ["Mỗi năng lực có dẫn chứng.", "Có nêu điểm còn yếu.", "Đã đọc nhận xét mentor.", "Mục tiêu mới có kết quả, người phụ trách và ngày kiểm tra.", "Cam kết dữ liệu đúng thực tế."],
    commonMistakes: ["Viết lời khen chung chung không có dẫn chứng.", "Đặt mục tiêu như 'tiếp tục phát triển' nhưng không có mốc kiểm tra.", "Chép nguyên văn phần tự đánh giá do AI tạo."],
    mentorCriteria: ["Tự đánh giá gắn với đầu ra.", "Nhu cầu hỗ trợ được phân nhóm.", "Mục tiêu tiếp theo cụ thể và có chủ sở hữu.", "Cam kết tính trung thực được xác nhận."],
    fieldHints: {
      selfAssessment: "Mỗi ý nên có cấu trúc: Tôi đã làm được… bằng chứng là…",
      mentorAssessment: "Chép hoặc tóm tắt đúng nhận xét đã nhận, không tự viết thay mentor.",
      nextGoal: "Nêu kết quả nhìn thấy được trong 30 ngày tới.",
      nextOwner: "Một người chịu trách nhiệm chính.",
      nextCheckpoint: "Ghi ngày hoặc mốc cụ thể, ví dụ 30/09/2026.",
      finalTruthConfirmed: "Chỉ xác nhận khi toàn bộ dữ liệu và minh chứng phản ánh đúng thực tế.",
    },
  },
};

export function buildTaskLearningContent(taskCode: string, sampleData?: Record<string, unknown>) {
  return {
    ...TASK_LEARNING_CONTENT[taskCode],
    sample: sampleData
      ? {
          title: "Ví dụ tham khảo: Nước mắm Quang Hải",
          note: "Đây là dữ liệu mô phỏng để hiểu cách làm. Không sao chép nếu không đúng với sản phẩm của bạn.",
          data: sampleData,
        }
      : null,
  };
}
