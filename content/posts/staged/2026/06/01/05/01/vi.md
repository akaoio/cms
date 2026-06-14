---
title: Ứng dụng dịch thuật học một ngôn ngữ sắp biến mất từ bốn mươi giờ băng ghi âm
description: Các nhà nghiên cứu đã huấn luyện một mô hình dịch thuật từ bốn mươi giờ ghi âm lưu trữ của một ngôn ngữ chỉ còn chưa đến chục người nói thành thạo, và kết quả đang thay đổi cách các nhà ngôn ngữ học nghĩ về việc bảo tồn ngôn ngữ.
lang: vi
---

# Ứng dụng dịch thuật học một ngôn ngữ sắp biến mất từ bốn mươi giờ băng ghi âm

Trong một kho lưu trữ của trường đại học, một hộp băng cassette được ghi âm hơn ba mươi năm trước đã nằm yên hầu như không ai chạm tới — những bản ghi âm thực địa của một ngôn ngữ ngày nay chỉ còn chưa đến chục người nói thành thạo, hầu hết đều trên tám mươi tuổi. Bốn mươi giờ băng ghi âm đó vừa trở thành toàn bộ dữ liệu huấn luyện cho một công cụ dịch thuật mới, và kết quả đã khiến chính những nhà nghiên cứu xây dựng nó cũng ngạc nhiên.

## Một loại dữ liệu huấn luyện khác

Hầu hết các hệ thống dịch thuật hiện đại được huấn luyện trên những bộ dữ liệu khổng lồ — hàng triệu cặp câu thu thập từ sách, trang web và phụ đề. Dự án này không có quyền truy cập vào bất kỳ thứ gì như vậy. Thay vào đó, các nhà nghiên cứu làm việc với những gì đã có sẵn: những bản ghi âm hàng chục năm tuổi về các cuộc hội thoại, câu chuyện và bài hát, được một nhóm nhỏ các nhà ngôn ngữ học và thành viên cộng đồng phiên âm một cách công phu trong hai năm qua.

Bộ dữ liệu này được phân chia đại khái như sau:

```
Bản ghi âm hội thoại:       ~18 giờ, đã phiên âm và đối chiếu với bản dịch
Câu chuyện/bài hát truyền thống: ~14 giờ, bản dịch một phần từ các bậc cao niên
Danh sách từ vựng và ngữ pháp:  ~8 giờ, từ vựng và quy tắc ngữ pháp có cấu trúc
```

Bốn mươi giờ là một phần rất nhỏ so với những gì các mô hình dịch thuật lớn thường sử dụng — thường ít hơn tới hàng nghìn lần. Cách tiếp cận của nhóm nghiên cứu dựa nhiều vào các ghi chú ngữ pháp có cấu trúc để giúp mô hình tổng quát hóa vượt ra ngoài những câu cụ thể mà nó đã thấy.

### Tại sao điều này quan trọng hơn một ngôn ngữ

Trong khoảng bảy nghìn ngôn ngữ còn được sử dụng trên thế giới, các nhà ngôn ngữ học ước tính một phần đáng kể có nguy cơ không còn được sử dụng trong thế kỷ tới, nhiều ngôn ngữ trong số đó không còn tài liệu viết nào ngoài chính loại bản ghi âm lưu trữ rời rạc này.

Cách tiếp cận được sử dụng ở đây được thiết kế có chủ đích để có thể lặp lại:

- Bắt đầu với bất kỳ bản ghi âm lưu trữ nào hiện có, dù là rời rạc
- Ưu tiên việc phiên âm do cộng đồng dẫn dắt hơn là các nhà ngôn ngữ học bên ngoài làm việc đơn lẻ
- Xây dựng các bộ dữ liệu ngữ pháp nhỏ, có cấu trúc thay vì chỉ dựa vào số lượng
- Giữ dữ liệu huấn luyện và kết quả đầu ra của công cụ dưới sự kiểm soát của cộng đồng

> "Chúng tôi không cố gắng thay thế những người nói thành thạo hay tạo ra thứ gì đó 'bảo tồn' ngôn ngữ trong một cái lọ. Mục tiêu là một công cụ mà cộng đồng có thể sử dụng theo cách của riêng họ — để giảng dạy, để ghi chép, hoặc bất cứ điều gì họ quyết định." — một nhà nghiên cứu của dự án

## Công cụ này có thể và không thể làm gì

Công cụ dịch thuật hoạt động tốt hơn rõ rệt với các cấu trúc câu và từ vựng xuất hiện thường xuyên trong các bản ghi âm huấn luyện — các cụm từ hội thoại hàng ngày, danh từ thông dụng, và những loại câu thường thấy trong các câu chuyện truyền thống. Nó hoạt động kém ổn định hơn với từ vựng kỹ thuật hoặc hiện đại đơn giản là không xuất hiện trong các bản ghi âm thực địa ba mươi năm tuổi, vì một lý do đơn giản: chính ngôn ngữ đó có thể chưa hình thành các thuật ngữ chuẩn cho những khái niệm chưa tồn tại vào thời điểm các bản ghi âm được thực hiện.

1. Hoạt động tốt: lời chào, thuật ngữ chỉ quan hệ huyết thống, mô tả các hoạt động hàng ngày, các câu chuyện truyền thống
2. Hoạt động trung bình: các đoạn hội thoại dài hơn với một số cấu trúc phức tạp
3. Hoạt động yếu: từ vựng kỹ thuật, khoa học hoặc công nghệ hiện đại

Các nhà nghiên cứu mô tả sự không đồng đều này là điều được dự đoán trước, và theo một cách nào đó, hữu ích — nó cho thấy chính xác nơi cần sự đóng góp của cộng đồng nhất, nếu công cụ này muốn phát triển cùng với ngôn ngữ thay vì đóng băng nó ở một bức ảnh chụp nhanh từ ba mươi năm trước.

## Phản ứng của cộng đồng

Đối với số ít những người vẫn nói thành thạo, nhiều người trong số họ cũng là ông bà và cụ trong gia đình, phản ứng được cho là dao động từ sự quan tâm thận trọng đến xúc động. Một số thành viên cộng đồng đã bắt đầu sử dụng các phiên bản đầu của công cụ với những người thân trẻ tuổi hơn, coi đó không phải là một sản phẩm hoàn chỉnh mà nhiều hơn là một công cụ khơi gợi cuộc trò chuyện — một cách để đặt ra các câu hỏi dẫn đến việc một người ông hoặc bà kể một câu chuyện bằng lời của riêng họ, sau đó có thể được ghi âm lại và bổ sung vào bộ dữ liệu.

Vòng lặp đó — công cụ khơi gợi cuộc trò chuyện, cuộc trò chuyện trở thành dữ liệu huấn luyện mới, dữ liệu mới cải thiện công cụ — theo các nhà nghiên cứu, chính là mục tiêu dài hạn thực sự. Không phải một ứng dụng dịch thuật tĩnh, mà là một tài liệu sống tiếp tục phát triển miễn là còn có người sẵn sàng tiếp tục nói chuyện.

## Điều gì tiếp theo

Nhóm nghiên cứu đã công bố phương pháp huấn luyện của họ, nhưng có chủ đích không công bố chính bộ dữ liệu để tôn trọng quyền sở hữu của cộng đồng đối với các bản ghi âm. Một số cộng đồng khác đang làm việc với các bộ lưu trữ nhỏ tương tự của các ngôn ngữ có nguy cơ biến mất đã liên hệ, và nhóm nghiên cứu hiện đang xây dựng tài liệu hướng dẫn để giúp các nhóm cộng đồng không có nền tảng kỹ thuật áp dụng cách tiếp cận tương tự cho các bộ lưu trữ của riêng họ — biến những hộp băng cũ, nằm trong các gác mái và hầm chứa của các trường đại học trên toàn thế giới, thành thứ có thể tồn tại lâu hơn cả những cuộn băng đó.
