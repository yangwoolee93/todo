import { BackupPanel, ThemeSelector } from "@renderer/features/settings";
import { Card } from "@renderer/shared/ui";

/** 설정 페이지 */
export default function SettingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 헤더 — TodoPage 패턴 */}
      <div className="m-6 mb-2">
        <h1 className="text-2xl font-medium text-fg">설정</h1>
      </div>

      {/* 콘텐츠 */}
      <div className="scrollbar mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Card as="section">
          <h2 className="mb-1 font-semibold text-fg">테마</h2>
          <p className="mb-4 text-xs text-fg-secondary">
            밝은 모드, 어두운 모드, 시스템 자동 중 선택
          </p>
          <ThemeSelector />
        </Card>
        <Card as="section">
          <h2 className="mb-1 font-semibold text-fg">데이터 백업</h2>
          <p className="mb-4 text-xs text-fg-secondary">JSON 내보내기 및 불러오기</p>
          <BackupPanel />
        </Card>
      </div>
    </div>
  );
}
