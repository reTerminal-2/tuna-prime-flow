
export const MOCK_IMAGES = {
    steak: "/images/mocks/tuna-steak.png",
    sashimi: "/images/mocks/tuna-sashimi.png",
    canned: "/images/mocks/tuna-canned.png"
};

export const getMockImagesByCategory = (category: string): string[] => {
    const cat = category.toLowerCase();
    if (cat.includes('fresh') || cat.includes('steak')) return [MOCK_IMAGES.steak, MOCK_IMAGES.sashimi];
    if (cat.includes('frozen') || cat.includes('sashimi')) return [MOCK_IMAGES.sashimi, MOCK_IMAGES.steak];
    if (cat.includes('canned') || cat.includes('processed')) return [MOCK_IMAGES.canned];
    return [MOCK_IMAGES.steak, MOCK_IMAGES.sashimi, MOCK_IMAGES.canned];
};

export const getFallbackImage = (category?: string): string => {
    if (!category) return MOCK_IMAGES.steak;
    const mocks = getMockImagesByCategory(category);
    return mocks[0];
};
