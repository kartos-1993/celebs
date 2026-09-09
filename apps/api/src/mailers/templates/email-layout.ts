export interface EmailLayoutOptions {
  title: string;
  previewText?: string;
  brandName?: string;
  brandColor?: string;
  contentHtml: string;
}

/**
 * Standard, professional, and minimalist base email layout.
 * Optimized for cross-client compatibility (Gmail, Outlook, Apple Mail, iOS, Android).
 */
export function renderEmailLayout({
  title,
  previewText,
  brandName = 'Celebs',
  brandColor = '#0F172A',
  contentHtml,
}: EmailLayoutOptions): string {
  const currentYear = new Date().getFullYear();
  const safePreviewText = previewText ? previewText.replace(/"/g, '&quot;') : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      line-height: 1.6;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      vertical-align: top;
    }
    a {
      color: #0F172A;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: 0 !important;
      }
      .content-cell {
        padding: 24px 20px !important;
      }
      .header-cell {
        padding: 24px 20px 20px 20px !important;
      }
      .footer-cell {
        padding: 24px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC;">
  ${
    safePreviewText
      ? `<div style="display: none; font-size: 1px; color: #F8FAFC; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
      ${safePreviewText}
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>`
      : ''
  }

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" class="email-container" width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);">
          
          <!-- Header -->
          <tr>
            <td class="header-cell" style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #F1F5F9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: ${brandColor}; text-transform: uppercase;">
                      ${brandName}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-cell" style="padding: 32px; font-size: 15px; color: #334155; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-cell" style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748B;">
                Need help? Contact us at <a href="mailto:support@celebs.com.np" style="color: #0F172A; font-weight: 500; text-decoration: underline;">support@celebs.com.np</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; ${currentYear} ${brandName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Clean, standard primary call-to-action button.
 */
export function renderButton(
  text: string,
  url: string,
  variant: 'primary' | 'secondary' = 'primary',
): string {
  const bg = variant === 'primary' ? '#0F172A' : '#F1F5F9';
  const color = variant === 'primary' ? '#FFFFFF' : '#0F172A';
  const border = variant === 'primary' ? '1px solid #0F172A' : '1px solid #CBD5E1';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0 16px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: ${bg};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: ${color}; text-decoration: none; border-radius: 8px; border: ${border};">
            ${text} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Standard badge for status indications (e.g. Confirmed, Pending, Approved).
 */
export function renderBadge(
  text: string,
  tone: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral',
): string {
  const styles = {
    success: 'background-color: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;',
    warning: 'background-color: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;',
    danger: 'background-color: #FEF2F2; color: #991B1B; border: 1px solid #FECACA;',
    neutral: 'background-color: #F1F5F9; color: #334155; border: 1px solid #CBD5E1;',
  }[tone];

  return `<span style="display: inline-block; padding: 3px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.03em; ${styles}">${text}</span>`;
}

/**
 * Reusable card for contextual alerts or highlighted info.
 */
export function renderInfoCard(
  contentHtml: string,
  tone: 'neutral' | 'success' | 'danger' | 'warning' = 'neutral',
): string {
  const styles = {
    neutral: 'background-color: #F8FAFC; border: 1px solid #E2E8F0;',
    success: 'background-color: #F0FDF4; border: 1px solid #BBF7D0;',
    danger: 'background-color: #FEF2F2; border: 1px solid #FECACA;',
    warning: 'background-color: #FFFBEB; border: 1px solid #FDE68A;',
  }[tone];

  return `
    <div style="margin: 20px 0; padding: 16px 20px; border-radius: 8px; font-size: 14px; line-height: 1.5; ${styles}">
      ${contentHtml}
    </div>
  `;
}
