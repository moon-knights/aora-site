using Aora.Models;

namespace Aora.Helpers
{
    // منطق ساخت HTML کامل یک صفحه (هدر/فوتر گلوبال + محتوا)، به اشتراک‌گذاشته‌شده
    // بین SettingsController (رندر با درخواست صریح) و Program.cs (فال‌بک مسیرهای داینامیک).
    public static class PageRenderer
    {
        public static string BuildFullPageHtml(Page page, SiteSettings? settings)
        {
            var logoUrl = settings?.LogoUrl ?? "";
            var siteName = settings?.SiteName ?? "آئورا";
            var favicon = settings?.FaviconUrl ?? "/favicon.ico";
            var globalCss = settings?.CustomCss ?? "";
            var headScripts = settings?.CustomHeadScripts ?? "";
            var headerHtml = settings?.GlobalHeaderHtml ?? "";
            var headerCss = settings?.GlobalHeaderCss ?? "";
            var footerHtml = settings?.GlobalFooterHtml ?? "";
            var footerCss = settings?.GlobalFooterCss ?? "";

            headerHtml = headerHtml
                .Replace("{{LOGO_URL}}", logoUrl)
                .Replace("{{SITE_NAME}}", siteName);

            return $@"<!DOCTYPE html>
<html lang=""fa"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1"">
    <title>{page.Title} — {siteName}</title>
    <meta name=""description"" content=""{page.MetaDescription ?? ""}"">
    <link rel=""icon"" href=""{favicon}"">
    <link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link href=""https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap"" rel=""stylesheet"">

    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Vazirmatn', sans-serif; }}
        {globalCss}
        {headerCss}
        {footerCss}
    </style>

    <style>
        {page.CssContent}
    </style>

    {headScripts}
</head>
<body>
    <header id=""globalHeader"">
        {headerHtml}
    </header>

    <main id=""pageContent"">
        {page.HtmlContent}
    </main>

    <footer id=""globalFooter"">
        {footerHtml}
    </footer>
</body>
</html>";
        }
    }
}
