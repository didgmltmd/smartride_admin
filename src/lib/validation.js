export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 5;
export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
export function validateImages(files, existingCount = 0) {
  if (files.length + existingCount > MAX_IMAGES) return '이미지는 최대 5개까지 첨부할 수 있습니다.';
  for (const file of files) {
    if (!/\.(png|jpe?g|webp)$/i.test(file.name) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'JPG, PNG, WEBP 이미지 파일만 선택해 주세요.';
    if (!file.size || file.size > MAX_IMAGE_BYTES) return '이미지는 파일당 5MB 이하로 선택해 주세요.';
  }
  return '';
}
export function validateExcel(file) {
  if (!file) return '업로드할 엑셀 파일을 먼저 선택해 주세요.';
  if (!/\.xlsx$/i.test(file.name)) return '.xlsx 파일을 선택해 주세요. 기존 .xls 파일은 Excel에서 .xlsx로 저장해 주세요.';
  if (!file.size || file.size > MAX_EXCEL_BYTES) return '엑셀 파일은 10MB 이하로 선택해 주세요.';
  return '';
}
export function validatePassword(password) {
  return password.length >= 10 && password.length <= 128 ? '' : '비밀번호는 10~128자로 입력해 주세요.';
}
export function errorMessage(error, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  if (error?.code === 'ERR_NETWORK') return '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  if (error?.code === 'ECONNABORTED') return '응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
  return error?.response?.data?.message || error?.message || fallback;
}
