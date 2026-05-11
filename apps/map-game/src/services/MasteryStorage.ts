/**
 * 마스터리(숙련도) 데이터 구조
 * regionCode(지역코드): percentage(달성률 0~100)
 */
export interface MasteryRecord {
    [regionCode: string]: number;
}

const STORAGE_KEYS = {
    MASTERY: 'map-mastery-v1',       // 숙련도 저장 키
    DIFFICULTY: 'game-difficulty',   // 난이도 저장 키 (SettingsContext와 연동가능)
    LEVEL: 'game-level',             // 레벨 저장 키
};

export const MasteryStorage = {
    // --- 숙련도 (Mastery) 관련 메서드 ---

    /**
     * 특정 지역의 숙련도를 저장합니다.
     * 기존 기록보다 높을 경우에만 덮어쓰기 합니다. (최고 기록 유지)
     */
    saveMastery: (regionCode: string, percentage: number) => {
        try {
            const current = MasteryStorage.loadAllMastery();
            const previous = current[regionCode] || 0;
            // 기획서: "이미 마스터한 챕터도 재훈련 가능하지만, 마스터 배지는 유지"
            // 따라서 저장소에는 항상 '최고 기록'을 남깁니다.
            const newMastery = Math.max(previous, percentage);

            const updated = { ...current, [regionCode]: newMastery };
            localStorage.setItem(STORAGE_KEYS.MASTERY, JSON.stringify(updated));
        } catch (e) {
            console.error('숙련도 저장 실패:', e);
        }
    },

    /**
     * 모든 지역의 숙련도 기록을 불러옵니다.
     */
    loadAllMastery: (): MasteryRecord => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.MASTERY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('숙련도 로드 실패:', e);
            return {};
        }
    },

    /**
     * 특정 지역의 숙련도를 가져옵니다. (없으면 0 반환)
     */
    getMastery: (regionCode: string): number => {
        const all = MasteryStorage.loadAllMastery();
        return all[regionCode] || 0;
    },

    // --- 설정 (난이도) 관련 메서드 ---

    saveDifficulty: (difficulty: 'NORMAL' | 'HARD') => {
        localStorage.setItem(STORAGE_KEYS.DIFFICULTY, JSON.stringify(difficulty));
    },

    getDifficulty: (): 'NORMAL' | 'HARD' => { // 기본값: NORMAL
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DIFFICULTY);
            return raw ? JSON.parse(raw) : 'NORMAL';
        } catch {
            return 'NORMAL';
        }
    }
};
