import { BackupPanel, ThemeSelector } from "@renderer/features/settings";
import { Card } from "@renderer/shared/ui";

/** 설정 페이지
 *
 * - 테마 선택
 * - 데이터 백업: JSON/SQL 내보내기 및 JSON 불러오기
 */
export default function SettingPage() {
  return (
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4 gap-4">
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
  );
}
