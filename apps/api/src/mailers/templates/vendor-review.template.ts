export const vendorApprovalTemplate = (shopName: string) => ({
  subject: 'Congratulations! Your Vendor Application is Approved',
  text: `Hello ${shopName},\n\nYour vendor application has been approved by the Celebs moderation team! You can now log in to your seller portal, upload catalog products, and start receiving orders.\n\nThank you for partnering with Celebs.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #16a34a;">Vendor Application Approved 🎉</h2>
      <p>Hello <strong>${shopName}</strong>,</p>
      <p>Great news! Your vendor profile and store verification documents have been <strong>approved</strong> by our team.</p>
      <p>You can now log in to your seller portal to add catalog products, manage inventory, and start selling.</p>
      <div style="margin: 25px 0;">
        <a href="http://localhost:5173/login" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Seller Portal</a>
      </div>
      <p style="color: #666; font-size: 14px;">Welcome aboard,<br/>The Celebs Platform Team</p>
    </div>
  `,
});

export const vendorRejectionTemplate = (shopName: string, reason: string) => ({
  subject: 'Update on Your Vendor Application Status',
  text: `Hello ${shopName},\n\nYour vendor application requires changes before approval.\n\nFeedback / Reason: ${reason}\n\nPlease log in to your dashboard to update your profile and resubmit.\n\nThank you,\nCelebs Moderation Team`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Vendor Application Needs Revision</h2>
      <p>Hello <strong>${shopName}</strong>,</p>
      <p>Thank you for submitting your vendor application. Our moderation team reviewed your details and found items that require updates before we can activate your account.</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #991b1b;">Moderation Note / Reason:</strong>
        <p style="margin-top: 5px; color: #7f1d1d;">${reason || 'Please review your document uploads and business details for clarity.'}</p>
      </div>
      <p>Please log in to your onboarding portal to update the flagged details and resubmit for verification.</p>
      <div style="margin: 25px 0;">
        <a href="http://localhost:5173/onboarding" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Application & Resubmit</a>
      </div>
      <p style="color: #666; font-size: 14px;">Thank you,<br/>The Celebs Moderation Team</p>
    </div>
  `,
});
