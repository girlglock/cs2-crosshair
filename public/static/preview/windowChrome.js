export function initWindowDrag() {
    const win = document.getElementById("mainWindow");
    const titleBar = win.querySelector(".title-bar");
    if (!win || !titleBar) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const startDrag = (clientX, clientY) => {
        const rect = win.getBoundingClientRect();
        if (win.style.position !== "fixed") {
            win.style.position = "fixed";
            win.style.margin = "0";
            win.style.left = rect.left + "px";
            win.style.top = rect.top + "px";
        }
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        dragging = true;
        document.body.style.userSelect = "none";
    };

    const moveDrag = (clientX, clientY) => {
        if (!dragging) return;
        const minVisible = 60;
        const maxLeft = window.innerWidth - minVisible;
        const maxTop = window.innerHeight - 30;
        const newLeft = Math.min(Math.max(clientX - offsetX, minVisible - win.offsetWidth), maxLeft);
        const newTop = Math.min(Math.max(clientY - offsetY, 0), maxTop);
        win.style.left = newLeft + "px";
        win.style.top = newTop + "px";
    };

    const endDrag = () => {
        dragging = false;
        document.body.style.userSelect = "";
    };

    titleBar.addEventListener("mousedown", (e) => {
        if (e.target.closest(".title-bar-controls")) return;
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
}

export function initThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    const link = document.getElementById("darkThemeLink");
    if (!toggle || !link) return;

    const refreshLabel = () => {
        const isDark = document.documentElement.classList.contains("dark-mode");
        toggle.textContent = isDark ? "Dark" : "Light";
    };
    refreshLabel();

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle("dark-mode");
        link.media = isDark ? "all" : "not all";
        localStorage.setItem("theme", isDark ? "dark" : "light");
        refreshLabel();
    };

    toggle.addEventListener("click", toggleTheme);
    toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTheme();
        }
    });
}
