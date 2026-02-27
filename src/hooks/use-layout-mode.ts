import { useLocation } from "react-router-dom";

export const useIsMobileLayout = () => {
    const location = useLocation();
    return location.pathname.startsWith('/mobile');
};
