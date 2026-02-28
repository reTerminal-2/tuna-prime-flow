
export const MOCK_IMAGES = {
    steak: "/images/mocks/tuna-steak.png",
    sashimi: "/images/mocks/tuna-sashimi.png",
    canned: "/images/mocks/tuna-canned.png",
    label: "/images/mocks/tuna-label.png",
    plated: "/images/mocks/tuna-plated.png"
};

export const getMockImagesByCategory = (category: string): string[] => {
    const cat = category.toLowerCase();
    if (cat.includes('fresh') || cat.includes('steak')) return [MOCK_IMAGES.steak, MOCK_IMAGES.plated, MOCK_IMAGES.sashimi];
    if (cat.includes('frozen') || cat.includes('sashimi')) return [MOCK_IMAGES.sashimi, MOCK_IMAGES.steak, MOCK_IMAGES.label];
    if (cat.includes('canned') || cat.includes('processed')) return [MOCK_IMAGES.canned, MOCK_IMAGES.label];
    return [MOCK_IMAGES.steak, MOCK_IMAGES.label, MOCK_IMAGES.plated];
};

export const getFallbackImage = (category?: string): string => {
    if (!category) return MOCK_IMAGES.steak;
    const mocks = getMockImagesByCategory(category);
    return mocks[0];
};
