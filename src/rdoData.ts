export interface BIRRDO {
  code: string;
  name: string;
  location: string;
  region?: string;
}

export const birRDOList: BIRRDO[] = [
  // Revenue Region 1 - Calasiao, Pangasinan
  { code: '001', name: 'RDO No. 001', location: 'Laoag City, Ilocos Norte', region: 'RR 1 - Calasiao, Pangasinan' },
  { code: '002', name: 'RDO No. 002', location: 'Vigan City, Ilocos Sur', region: 'RR 1 - Calasiao, Pangasinan' },
  { code: '003', name: 'RDO No. 003', location: 'San Fernando City, La Union', region: 'RR 1 - Calasiao, Pangasinan' },
  { code: '004', name: 'RDO No. 004', location: 'Calasiao, West Pangasinan', region: 'RR 1 - Calasiao, Pangasinan' },
  { code: '006', name: 'RDO No. 006', location: 'Urdaneta City, East Pangasinan', region: 'RR 1 - Calasiao, Pangasinan' },

  // Revenue Region 2 - Cordillera Administrative Region (CAR)
  { code: '007', name: 'RDO No. 007', location: 'Bangued, Abra', region: 'RR 2 - CAR (Baguio City)' },
  { code: '008', name: 'RDO No. 008', location: 'Baguio City, Benguet', region: 'RR 2 - CAR (Baguio City)' },
  { code: '009', name: 'RDO No. 009', location: 'La Trinidad, Benguet', region: 'RR 2 - CAR (Baguio City)' },
  { code: '010', name: 'RDO No. 010', location: 'Bontoc, Mountain Province', region: 'RR 2 - CAR (Baguio City)' },
  { code: '011', name: 'RDO No. 011', location: 'Tabuk City, Kalinga', region: 'RR 2 - CAR (Baguio City)' },
  { code: '012', name: 'RDO No. 012', location: 'Lagawe, Ifugao', region: 'RR 2 - CAR (Baguio City)' },

  // Revenue Region 3 - Tuguegarao, Cagayan
  { code: '013', name: 'RDO No. 013', location: 'Tuguegarao City, Cagayan', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '014', name: 'RDO No. 014', location: 'Aparri, Cagayan', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '015', name: 'RDO No. 015', location: 'Naguilian, Isabela', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '016', name: 'RDO No. 016', location: 'Cabagan, Isabela', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '017A', name: 'RDO No. 017A', location: 'Bayombong, Nueva Vizcaya', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '017B', name: 'RDO No. 017B', location: 'Cabarroguis, Quirino', region: 'RR 3 - Tuguegarao, Cagayan' },
  { code: '018', name: 'RDO No. 018', location: 'Basco, Batanes', region: 'RR 3 - Tuguegarao, Cagayan' },

  // Revenue Region 4 - City of San Fernando, Pampanga
  { code: '019', name: 'RDO No. 019', location: 'Subic Bay Freeport Zone', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '020', name: 'RDO No. 020', location: 'Balanga City, Bataan', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '021A', name: 'RDO No. 021A', location: 'Angeles City, Pampanga', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '021B', name: 'RDO No. 021B', location: 'City of San Fernando, Pampanga', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '022', name: 'RDO No. 022', location: 'Baler, Aurora', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '023A', name: 'RDO No. 023A', location: 'Talavera, North Nueva Ecija', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '023B', name: 'RDO No. 023B', location: 'Cabanatuan City, South Nueva Ecija', region: 'RR 4 - San Fernando, Pampanga' },
  { code: '029', name: 'RDO No. 029', location: 'Tarlac City, Tarlac', region: 'RR 4 - San Fernando, Pampanga' },

  // Revenue Region 5 - Valenzuela City
  { code: '024', name: 'RDO No. 024', location: 'Valenzuela City', region: 'RR 5 - Valenzuela City' },
  { code: '025A', name: 'RDO No. 025A', location: 'Plaridel, West Bulacan', region: 'RR 5 - Valenzuela City' },
  { code: '025B', name: 'RDO No. 025B', location: 'Santa Maria, East Bulacan', region: 'RR 5 - Valenzuela City' },
  { code: '026', name: 'RDO No. 026', location: 'Malabon / Navotas City', region: 'RR 5 - Valenzuela City' },
  { code: '027', name: 'RDO No. 027', location: 'Caloocan City', region: 'RR 5 - Valenzuela City' },

  // Revenue Region 6 - Manila
  { code: '030', name: 'RDO No. 030', location: 'Binondo, Manila', region: 'RR 6 - Manila' },
  { code: '031', name: 'RDO No. 031', location: 'Sta. Cruz, Manila', region: 'RR 6 - Manila' },
  { code: '032', name: 'RDO No. 032', location: 'Quiapo / Sampaloc / Sta. Mesa, Manila', region: 'RR 6 - Manila' },
  { code: '033', name: 'RDO No. 033', location: 'Intramuros / Ermita / Malate, Manila', region: 'RR 6 - Manila' },
  { code: '034', name: 'RDO No. 034', location: 'Paco / Pandacan / Sta. Ana, Manila', region: 'RR 6 - Manila' },

  // Revenue Region 7A - Quezon City
  { code: '028', name: 'RDO No. 028', location: 'Novaliches, Quezon City', region: 'RR 7A - Quezon City' },
  { code: '038', name: 'RDO No. 038', location: 'North Quezon City', region: 'RR 7A - Quezon City' },
  { code: '039', name: 'RDO No. 039', location: 'South Quezon City', region: 'RR 7A - Quezon City' },
  { code: '040', name: 'RDO No. 040', location: 'Cubao, Quezon City', region: 'RR 7A - Quezon City' },

  // Revenue Region 7B - East NCR
  { code: '041', name: 'RDO No. 041', location: 'Mandaluyong City', region: 'RR 7B - East NCR' },
  { code: '042', name: 'RDO No. 042', location: 'San Juan City', region: 'RR 7B - East NCR' },
  { code: '043A', name: 'RDO No. 043A', location: 'East Pasig City', region: 'RR 7B - East NCR' },
  { code: '043B', name: 'RDO No. 043B', location: 'West Pasig City', region: 'RR 7B - East NCR' },
  { code: '044', name: 'RDO No. 044', location: 'Taguig City / Pateros', region: 'RR 7B - East NCR' },
  { code: '045', name: 'RDO No. 045', location: 'Marikina City', region: 'RR 7B - East NCR' },
  { code: '046', name: 'RDO No. 046', location: 'Cainta / Taytay, Rizal', region: 'RR 7B - East NCR' },
  { code: '047', name: 'RDO No. 047', location: 'East Rizal (Antipolo City)', region: 'RR 7B - East NCR' },
  { code: '048', name: 'RDO No. 048', location: 'West Rizal', region: 'RR 7B - East NCR' },

  // Revenue Region 8A - Makati City
  { code: '054A', name: 'RDO No. 054A', location: 'South Makati City', region: 'RR 8A - Makati City' },
  { code: '054B', name: 'RDO No. 054B', location: 'North Makati City', region: 'RR 8A - Makati City' },

  // Revenue Region 8B - South NCR
  { code: '051', name: 'RDO No. 051', location: 'Pasay City', region: 'RR 8B - South NCR' },
  { code: '052', name: 'RDO No. 052', location: 'Parañaque City', region: 'RR 8B - South NCR' },
  { code: '053A', name: 'RDO No. 053A', location: 'Las Piñas City', region: 'RR 8B - South NCR' },
  { code: '053B', name: 'RDO No. 053B', location: 'Muntinlupa City', region: 'RR 8B - South NCR' },

  // Revenue Region 9A - San Pablo City
  { code: '049', name: 'RDO No. 049', location: 'North Cavite (Kawit)', region: 'RR 9A - San Pablo City' },
  { code: '050', name: 'RDO No. 050', location: 'South Cavite (Trece Martires)', region: 'RR 9A - San Pablo City' },
  { code: '056', name: 'RDO No. 056', location: 'Central Batangas (Tanauan)', region: 'RR 9A - San Pablo City' },
  { code: '057', name: 'RDO No. 057', location: 'West Batangas (Lian)', region: 'RR 9A - San Pablo City' },
  { code: '058', name: 'RDO No. 058', location: 'Batangas City, East Batangas', region: 'RR 9A - San Pablo City' },
  { code: '059', name: 'RDO No. 059', location: 'Lipa City, Batangas', region: 'RR 9A - San Pablo City' },
  { code: '060', name: 'RDO No. 060', location: 'Lucena City, Quezon', region: 'RR 9A - San Pablo City' },
  { code: '061', name: 'RDO No. 061', location: 'Calauag, Quezon', region: 'RR 9A - San Pablo City' },

  // Revenue Region 9B - MIMAROPA
  { code: '062', name: 'RDO No. 062', location: 'Boac, Marinduque', region: 'RR 9B - MIMAROPA' },
  { code: '063', name: 'RDO No. 063', location: 'Calapan City, Oriental Mindoro', region: 'RR 9B - MIMAROPA' },
  { code: '064', name: 'RDO No. 064', location: 'Mamburao, Occidental Mindoro', region: 'RR 9B - MIMAROPA' },
  { code: '127', name: 'RDO No. 127', location: 'Puerto Princesa City, Palawan', region: 'RR 9B - MIMAROPA' },

  // Revenue Region 10 - Legazpi City
  { code: '065', name: 'RDO No. 065', location: 'Naga City, Camarines Sur', region: 'RR 10 - Legazpi City' },
  { code: '066', name: 'RDO No. 066', location: 'Iriga City, Camarines Sur', region: 'RR 10 - Legazpi City' },
  { code: '067', name: 'RDO No. 067', location: 'Legazpi City, Albay', region: 'RR 10 - Legazpi City' },
  { code: '068', name: 'RDO No. 068', location: 'Sorsogon City, Sorsogon', region: 'RR 10 - Legazpi City' },
  { code: '069', name: 'RDO No. 069', location: 'Virac, Catanduanes', region: 'RR 10 - Legazpi City' },
  { code: '070', name: 'RDO No. 070', location: 'Masbate City, Masbate', region: 'RR 10 - Legazpi City' },

  // Revenue Region 11 - Iloilo City
  { code: '071', name: 'RDO No. 071', location: 'Kalibo, Aklan', region: 'RR 11 - Iloilo City' },
  { code: '072', name: 'RDO No. 072', location: 'Roxas City, Capiz', region: 'RR 11 - Iloilo City' },
  { code: '073', name: 'RDO No. 073', location: 'San Jose, Antique', region: 'RR 11 - Iloilo City' },
  { code: '074', name: 'RDO No. 074', location: 'Iloilo City, Iloilo', region: 'RR 11 - Iloilo City' },
  { code: '075', name: 'RDO No. 075', location: 'Zarraga, Iloilo', region: 'RR 11 - Iloilo City' },

  // Revenue Region 12 - Bacolod City
  { code: '076', name: 'RDO No. 076', location: 'Victorias City, Negros Occidental', region: 'RR 12 - Bacolod City' },
  { code: '077', name: 'RDO No. 077', location: 'Bacolod City, Negros Occidental', region: 'RR 12 - Bacolod City' },
  { code: '078', name: 'RDO No. 078', location: 'Binalbagan, Negros Occidental', region: 'RR 12 - Bacolod City' },
  { code: '079', name: 'RDO No. 079', location: 'Dumaguete City, Negros Oriental', region: 'RR 12 - Bacolod City' },

  // Revenue Region 13 - Cebu City
  { code: '080', name: 'RDO No. 080', location: 'Mandaue City, Cebu', region: 'RR 13 - Cebu City' },
  { code: '081', name: 'RDO No. 081', location: 'Cebu City North', region: 'RR 13 - Cebu City' },
  { code: '082', name: 'RDO No. 082', location: 'Cebu City South', region: 'RR 13 - Cebu City' },
  { code: '083', name: 'RDO No. 083', location: 'Talisay City, Cebu', region: 'RR 13 - Cebu City' },
  { code: '084', name: 'RDO No. 084', location: 'Tagbilaran City, Bohol', region: 'RR 13 - Cebu City' },

  // Revenue Region 14 - Tacloban City
  { code: '085', name: 'RDO No. 085', location: 'Catarman, Northern Samar', region: 'RR 14 - Tacloban City' },
  { code: '086', name: 'RDO No. 086', location: 'Borongan, Eastern Samar', region: 'RR 14 - Tacloban City' },
  { code: '087', name: 'RDO No. 087', location: 'Calbayog City, Samar', region: 'RR 14 - Tacloban City' },
  { code: '088', name: 'RDO No. 088', location: 'Tacloban City, Leyte', region: 'RR 14 - Tacloban City' },
  { code: '089', name: 'RDO No. 089', location: 'Ormoc City, Leyte', region: 'RR 14 - Tacloban City' },
  { code: '090', name: 'RDO No. 090', location: 'Maasin City, Southern Leyte', region: 'RR 14 - Tacloban City' },

  // Revenue Region 15 - Zamboanga City
  { code: '091', name: 'RDO No. 091', location: 'Dipolog City, Zamboanga del Norte', region: 'RR 15 - Zamboanga City' },
  { code: '092', name: 'RDO No. 092', location: 'Pagadian City, Zamboanga del Sur', region: 'RR 15 - Zamboanga City' },
  { code: '093A', name: 'RDO No. 093A', location: 'Zamboanga City', region: 'RR 15 - Zamboanga City' },
  { code: '093B', name: 'RDO No. 093B', location: 'Ipil, Zamboanga Sibugay', region: 'RR 15 - Zamboanga City' },
  { code: '094', name: 'RDO No. 094', location: 'Isabela, Basilan', region: 'RR 15 - Zamboanga City' },
  { code: '095', name: 'RDO No. 095', location: 'Jolo, Sulu', region: 'RR 15 - Zamboanga City' },
  { code: '096', name: 'RDO No. 096', location: 'Bongao, Tawi-Tawi', region: 'RR 15 - Zamboanga City' },

  // Revenue Region 16 - Cagayan de Oro City
  { code: '097', name: 'RDO No. 097', location: 'Gingoog City, Misamis Oriental', region: 'RR 16 - Cagayan de Oro' },
  { code: '098', name: 'RDO No. 098', location: 'Cagayan de Oro City', region: 'RR 16 - Cagayan de Oro' },
  { code: '099', name: 'RDO No. 099', location: 'Malaybalay City, Bukidnon', region: 'RR 16 - Cagayan de Oro' },
  { code: '100', name: 'RDO No. 100', location: 'Ozamiz City, Misamis Occidental', region: 'RR 16 - Cagayan de Oro' },
  { code: '101', name: 'RDO No. 101', location: 'Iligan City, Lanao del Norte', region: 'RR 16 - Cagayan de Oro' },
  { code: '102', name: 'RDO No. 102', location: 'Marawi City, Lanao del Sur', region: 'RR 16 - Cagayan de Oro' },

  // Revenue Region 17 - Butuan City
  { code: '103', name: 'RDO No. 103', location: 'Butuan City, Agusan del Norte', region: 'RR 17 - Butuan City' },
  { code: '104', name: 'RDO No. 104', location: 'Surigao City, Surigao del Norte', region: 'RR 17 - Butuan City' },
  { code: '105', name: 'RDO No. 105', location: 'San Francisco, Agusan del Sur', region: 'RR 17 - Butuan City' },
  { code: '106', name: 'RDO No. 106', location: 'Tandag City, Surigao del Sur', region: 'RR 17 - Butuan City' },

  // Revenue Region 18 - Koronadal City
  { code: '055', name: 'RDO No. 055', location: 'Cotabato City', region: 'RR 18 - Koronadal City' },
  { code: '107', name: 'RDO No. 107', location: 'Cotabato City, Maguindanao', region: 'RR 18 - Koronadal City' },
  { code: '108', name: 'RDO No. 108', location: 'Kidapawan City, North Cotabato', region: 'RR 18 - Koronadal City' },
  { code: '109', name: 'RDO No. 109', location: 'Koronadal City, South Cotabato', region: 'RR 18 - Koronadal City' },
  { code: '110', name: 'RDO No. 110', location: 'General Santos City', region: 'RR 18 - Koronadal City' },
  { code: '111', name: 'RDO No. 111', location: 'Tacurong City, Sultan Kudarat', region: 'RR 18 - Koronadal City' },

  // Revenue Region 19 - Davao City
  { code: '112', name: 'RDO No. 112', location: 'Tagum City, Davao del Norte', region: 'RR 19 - Davao City' },
  { code: '113A', name: 'RDO No. 113A', location: 'West Davao City', region: 'RR 19 - Davao City' },
  { code: '113B', name: 'RDO No. 113B', location: 'East Davao City', region: 'RR 19 - Davao City' },
  { code: '114', name: 'RDO No. 114', location: 'Mati City, Davao Oriental', region: 'RR 19 - Davao City' },
  { code: '115', name: 'RDO No. 115', location: 'Digos City, Davao del Sur', region: 'RR 19 - Davao City' },

  // Large Taxpayers Service (LTS)
  { code: '116', name: 'RDO No. 116', location: 'Large Taxpayers Audit Division I (LTAD I)', region: 'Large Taxpayers Service' },
  { code: '117', name: 'RDO No. 117', location: 'Large Taxpayers Audit Division II (LTAD II)', region: 'Large Taxpayers Service' },
  { code: '118', name: 'RDO No. 118', location: 'Large Taxpayers Division - Makati', region: 'Large Taxpayers Service' },
  { code: '119', name: 'RDO No. 119', location: 'Large Taxpayers Division - Cebu', region: 'Large Taxpayers Service' },
  { code: '120', name: 'RDO No. 120', location: 'Large Taxpayers Division - Davao', region: 'Large Taxpayers Service' },
  { code: '121', name: 'RDO No. 121', location: 'Excise Large Taxpayers Regulatory Division', region: 'Large Taxpayers Service' },
  { code: '122', name: 'RDO No. 122', location: 'Excise Large Taxpayers Field Operations Division', region: 'Large Taxpayers Service' },
  { code: '123', name: 'RDO No. 123', location: 'Excise Large Taxpayers Audit Division', region: 'Large Taxpayers Service' },
  { code: '124', name: 'RDO No. 124', location: 'Large Taxpayers Assistance Division', region: 'Large Taxpayers Service' },
  { code: '125', name: 'RDO No. 125', location: 'Large Taxpayers Document Processing Division', region: 'Large Taxpayers Service' },
  { code: '126', name: 'RDO No. 126', location: 'Large Taxpayers Collection Enforcement Division', region: 'Large Taxpayers Service' },
];
