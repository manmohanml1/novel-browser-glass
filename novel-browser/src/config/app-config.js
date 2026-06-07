export const CONFIG = {
  appName: 'Novel Browser',
  storageKey: 'mdg_novel_browser',
  apiBaseUrl: '',
  requestTimeout: 15000,
  cacheDuration: 5 * 60 * 1000
};

export function createDefaultData() {
  return {
    recentQuery: '',
    lastNovel: null,
    currentNovel: null,
    currentChapter: null,
    favorites: [],
    progressByChapter: {},
    readerSettings: {
      fontSize: 16,
      lineSpace: 0,
      comfort: true
    },
    recentNovels: []
  };
}
