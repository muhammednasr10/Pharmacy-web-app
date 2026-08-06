import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Page } from "../types";
import { pageFromPath, pageToPath } from "../routes/pageRoutes";

export function useAppPageNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePage = useMemo(
    () => pageFromPath(location.pathname),
    [location.pathname],
  );

  const setActivePage = useCallback(
    (page: Page | ((prev: Page) => Page)) => {
      const next = typeof page === "function" ? page(activePage) : page;
      const path = pageToPath(next);
      if (location.pathname !== path) {
        navigate(path);
      }
    },
    [activePage, location.pathname, navigate],
  );

  return { activePage, setActivePage, location, navigate };
}
