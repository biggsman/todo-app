// Design Ref: §6 — Korean user messages per error code and Result constructors.
// Kept apart from todo.ts so validate.ts can build failures without a runtime import cycle.
import type { AppError, ErrorCode, Result } from './todo';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  EMPTY_TITLE: '할 일 내용을 입력하세요',
  TITLE_TOO_LONG: '200자 이하로 입력하세요',
  INVALID_TAG: '태그는 20자 이하, 최대 10개입니다',
  INVALID_CATEGORY: '카테고리는 30자 이하입니다',
  STORAGE_QUOTA: '저장 공간이 부족해 저장하지 못했습니다. 내보내기로 백업하세요',
  STORAGE_UNAVAILABLE: '이 브라우저에서는 저장할 수 없습니다 (시크릿 모드 등)',
  STORAGE_CORRUPT: '저장된 데이터가 손상되어 새로 시작합니다. 원본은 따로 보관했습니다',
  STORAGE_CORRUPT_UNSAVED:
    '저장된 데이터가 손상되어 새로 시작합니다. 원본을 따로 보관하지 못해, 할 일을 추가하거나 바꾸면 원본이 사라집니다',
  IMPORT_INVALID_JSON: '올바른 JSON 파일이 아닙니다',
  IMPORT_SCHEMA_MISMATCH: 'todo-app 백업 파일이 아니거나 형식이 맞지 않습니다',
  IMPORT_TOO_LARGE: '5MB 이하 파일만 가져올 수 있습니다',
  IMPORT_BACKUP_FAILED:
    '현재 데이터를 백업하지 못해 가져오기를 취소했습니다. 기존 데이터는 그대로입니다',
};

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function makeError(code: ErrorCode): AppError {
  return { code, message: ERROR_MESSAGES[code] };
}

export function fail(code: ErrorCode): Result<never> {
  return { ok: false, error: makeError(code) };
}
