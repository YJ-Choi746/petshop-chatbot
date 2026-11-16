// 펫샵 기본(가상) 데이터 — 상품명·가격은 펫프렌즈 모바일 메인(2026-11-16 조회) 참고, 재고·주문·배송은 가상
// 저장된 데이터가 없을 때 서버가 이 값으로 시작하고, 관리자 '기본 데이터로 초기화'도 이 값을 씀
module.exports = {
  products: [
    { id: 'P001', name: '[3개월분/90스틱] 베스트 프라이스 푸푸루틴 유산균 2g x 30p x 3개', brand: '베스트 프라이스', category: '영양제', price: 29700, salePrice: 14820, reviews: 3437, keywords: '푸푸루틴,유산균', desc: '장 건강 유산균, 하루 1스틱' },
    { id: 'P002', name: '[ONLY펫프] 인트라젠 영양제 위장&면역 50p', brand: '인트라젠', category: '영양제', price: 18000, salePrice: 15000, reviews: 17740, keywords: '인트라젠,위장,면역', desc: '위장·면역 케어 영양제' },
    { id: 'P003', name: '오리젠 독 오리지날 11.4kg', brand: '오리젠', category: '건식사료', price: 177500, salePrice: 145400, reviews: 6867, keywords: '오리젠,오리지날', desc: '고단백 그레인프리 전연령 사료' },
    { id: 'P004', name: '인섹트도그 하이포알러젠 미니 7.5kg', brand: '인섹트도그', category: '건식사료', price: 135000, salePrice: 119100, reviews: 2164, keywords: '인섹트도그,하이포알러젠,알러지', desc: '곤충 단백질 저알러지 사료(소형 알갱이)' },
    { id: 'P005', name: '로얄캐닌 독 미니 인도어 어덜트 3kg', brand: '로얄캐닌', category: '건식사료', price: 48800, salePrice: 34040, reviews: 8842, keywords: '로얄캐닌 미니,인도어', desc: '실내 소형견 성견용, 소화기 건강' },
    { id: 'P006', name: '로얄캐닌 독 푸들 어덜트 3kg', brand: '로얄캐닌', category: '건식사료', price: 52700, salePrice: 37160, reviews: 6036, keywords: '푸들', desc: '푸들 전용 성견 사료, 피모 관리' },
    { id: 'P007', name: '베스트 프라이스 배변패드 중형 100매 (40x50cm)', brand: '베스트 프라이스', category: '배변용품', price: 12000, salePrice: 6500, reviews: 2582, keywords: '배변패드,패드', desc: '중형 40x50cm, 100매' },
    { id: 'P008', name: '그래니스 독 터키츄 롱스틱 30g', brand: '그래니스', category: '껌', price: 7900, salePrice: 5900, reviews: 8816, keywords: '터키츄,롱스틱,껌', desc: '칠면조 힘줄 롱스틱 껌' },
    { id: 'P009', name: '베스트 프라이스 딸깍트릿 닭가슴살 220g', brand: '베스트 프라이스', category: '간식', price: 32000, salePrice: 17500, reviews: 3702, keywords: '딸깍트릿,닭가슴살,트릿', desc: '훈련용 한입 닭가슴살 트릿' },
    { id: 'P010', name: '해피댕댕 윈터무스탕자켓 2종 (스카이블루,카멜) S-2XL', brand: '해피댕댕', category: '의류', price: 39800, salePrice: 34800, reviews: 0, keywords: '무스탕,자켓,패딩,옷', desc: 'NEW 신상, 무료배송, S~2XL' }
  ],
  inventory: [
    { productId: 'P001', stock: 320, safetyStock: 50, warehouse: '이천 물류센터', restockDate: '', memo: '' },
    { productId: 'P002', stock: 85, safetyStock: 30, warehouse: '이천 물류센터', restockDate: '', memo: '' },
    { productId: 'P003', stock: 0, safetyStock: 10, warehouse: '이천 물류센터', restockDate: '2026-11-20', memo: '수입 통관 지연으로 일시 품절' },
    { productId: 'P004', stock: 12, safetyStock: 15, warehouse: '이천 물류센터', restockDate: '2026-11-24', memo: '' },
    { productId: 'P005', stock: 540, safetyStock: 60, warehouse: '이천 물류센터', restockDate: '', memo: '' },
    { productId: 'P006', stock: 48, safetyStock: 30, warehouse: '이천 물류센터', restockDate: '', memo: '' },
    { productId: 'P007', stock: 1200, safetyStock: 200, warehouse: '김포 물류센터', restockDate: '', memo: '' },
    { productId: 'P008', stock: 7, safetyStock: 40, warehouse: '김포 물류센터', restockDate: '2026-11-19', memo: '6개 묶음 구매 시 재고 부족 가능' },
    { productId: 'P009', stock: 210, safetyStock: 40, warehouse: '김포 물류센터', restockDate: '', memo: '' },
    { productId: 'P010', stock: 34, safetyStock: 10, warehouse: '김포 물류센터', restockDate: '2026-11-21', memo: '카멜 M 품절, 스카이블루 전 사이즈 가능' }
  ],
  orders: [
    { orderNo: 'PF-261108-001', date: '2026-11-08', customer: '김*연', phoneLast4: '5821', productId: 'P005', option: '', qty: 1, amount: 34040, payment: '카드', status: '배송완료' },
    { orderNo: 'PF-261110-002', date: '2026-11-10', customer: '이*준', phoneLast4: '3307', productId: 'P007', option: '', qty: 6, amount: 39000, payment: '간편결제', status: '배송완료' },
    { orderNo: 'PF-261112-003', date: '2026-11-12', customer: '박*은', phoneLast4: '1192', productId: 'P003', option: '', qty: 1, amount: 145400, payment: '카드', status: '배송중' },
    { orderNo: 'PF-261113-004', date: '2026-11-13', customer: '최*우', phoneLast4: '7740', productId: 'P002', option: '', qty: 2, amount: 30000, payment: '간편결제', status: '배송중' },
    { orderNo: 'PF-261114-005', date: '2026-11-14', customer: '정*아', phoneLast4: '2468', productId: 'P009', option: '', qty: 2, amount: 35000, payment: '카드', status: '상품준비중' },
    { orderNo: 'PF-261114-006', date: '2026-11-14', customer: '강*민', phoneLast4: '9035', productId: 'P010', option: '카멜 / S', qty: 1, amount: 34800, payment: '카드', status: '교환요청' },
    { orderNo: 'PF-261115-007', date: '2026-11-15', customer: '윤*서', phoneLast4: '6613', productId: 'P001', option: '', qty: 1, amount: 14820, payment: '무통장입금', status: '결제완료' },
    { orderNo: 'PF-261115-008', date: '2026-11-15', customer: '한*희', phoneLast4: '4280', productId: 'P004', option: '', qty: 1, amount: 119100, payment: '카드', status: '배송중' },
    { orderNo: 'PF-261116-009', date: '2026-11-16', customer: '조*현', phoneLast4: '8157', productId: 'P006', option: '', qty: 2, amount: 74320, payment: '간편결제', status: '결제완료' },
    { orderNo: 'PF-261116-010', date: '2026-11-16', customer: '서*진', phoneLast4: '3946', productId: 'P008', option: '', qty: 6, amount: 35400, payment: '카드', status: '취소요청' }
  ],
  shipping: [
    { trackingNo: '601234561101', orderNo: 'PF-261108-001', carrier: 'CJ대한통운', status: '배송완료', location: '서울 마포구', eta: '2026-11-10', history: '11/08 17:40 집화처리 > 11/09 02:10 곤지암HUB 간선상차 > 11/10 07:30 배송출발 > 11/10 13:05 배송완료(문 앞)' },
    { trackingNo: '257700112202', orderNo: 'PF-261110-002', carrier: '롯데택배', status: '배송완료', location: '경기 성남시', eta: '2026-11-12', history: '11/10 18:10 집화처리 > 11/11 04:20 옥천터미널 > 11/12 08:00 배송출발 > 11/12 15:42 배송완료(경비실)' },
    { trackingNo: '601234563303', orderNo: 'PF-261112-003', carrier: 'CJ대한통운', status: '배송중', location: '대전HUB', eta: '2026-11-17', history: '11/14 16:55 집화처리 > 11/15 23:40 대전HUB 간선하차' },
    { trackingNo: '512088004404', orderNo: 'PF-261113-004', carrier: '한진택배', status: '배송출발', location: '인천 연수구 대리점', eta: '2026-11-16', history: '11/13 17:20 집화처리 > 11/14 03:15 대전허브 > 11/16 08:10 배송출발' },
    { trackingNo: '601234565505', orderNo: 'PF-261114-005', carrier: 'CJ대한통운', status: '운송장 발급(집화 전)', location: '김포 물류센터', eta: '2026-11-18', history: '11/16 09:00 운송장 발급 > 출고 준비 중' },
    { trackingNo: '257700116606', orderNo: 'PF-261114-006', carrier: '롯데택배', status: '반품 회수 예정', location: '부산 해운대구', eta: '2026-11-18', history: '11/14 18:00 집화처리 > 11/15 14:20 배송완료 > 11/16 10:30 교환(사이즈 M) 회수 접수' },
    { trackingNo: '-', orderNo: 'PF-261115-007', carrier: '-', status: '입금 확인 대기', location: '-', eta: '-', history: '11/15 21:10 주문 접수 > 무통장입금 확인 후 출고' },
    { trackingNo: '688800118808', orderNo: 'PF-261115-008', carrier: '우체국택배', status: '배송중', location: '광주우편집중국', eta: '2026-11-17', history: '11/15 16:30 접수 > 11/16 01:50 광주우편집중국 도착' },
    { trackingNo: '-', orderNo: 'PF-261116-009', carrier: '-', status: '출고 대기', location: '이천 물류센터', eta: '2026-11-18', history: '11/16 08:45 결제 완료 > 평일 15시 이전 결제건 당일 출고 예정' },
    { trackingNo: '-', orderNo: 'PF-261116-010', carrier: '-', status: '출고 중지', location: '김포 물류센터', eta: '-', history: '11/16 09:20 결제 완료 > 11/16 09:50 고객 취소 요청 > 출고 중지' }
  ],
  policy: {
    text: `[배송] 평일 오후 3시 이전 결제 시 당일 출고(주말·공휴일 제외), 출고 후 1~2일 내 도착
[배송비] 30,000원 이상 무료배송, 미만 시 3,000원
[취소] 결제완료 상태는 즉시 취소, 상품준비중 이후는 취소 요청 접수 후 처리
[교환/반품] 수령 후 7일 이내 신청, 단순 변심 시 왕복 배송비 6,000원 고객 부담
[교환/반품 불가] 사료·간식·영양제 개봉 또는 사용 시
[결제] 카드, 간편결제, 무통장입금(주문 후 24시간 내 입금)
[상담] AI 상담 24시간, 상담원 연결 평일 10:00~18:00`
  }
};
