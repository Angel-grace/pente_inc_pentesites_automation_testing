import { test, expect } from "@playwright/test";
import { qase } from "playwright-qase-reporter";

/* =========================================================
   CONFIG
   ========================================================= */

const baseUrl = "https://www.geeksforgeeks.org/";
const yopmailUrl = "https://yopmail.com/en/";

/* =========================================================
   HELPERS
   ========================================================= */

function generateYopmailEmail() {
  const random = Math.random().toString(36).substring(2, 8);
  return `gfg_${random}@yopmail.com`;
}

function generateStrongPassword() {
  const random = Math.random().toString(36).substring(2, 8);
  return `Gfg@${random}9`;
}

// Verify account via Yopmail
async function verifyEmailFromYopmail(page, email) {
  const inboxName = email.split("@")[0];
  const yopmailPage = await page.context().newPage();
  await yopmailPage.goto(yopmailUrl, { waitUntil: "domcontentloaded" });

  await yopmailPage.locator("#login").fill(inboxName);
  await yopmailPage.keyboard.press("Enter");

  const inboxFrame = yopmailPage.frameLocator("#ifinbox");

  await expect
    .poll(async () => await inboxFrame.locator("button.lm").count(), {
      timeout: 60000,
    })
    .toBeGreaterThan(0);

  await inboxFrame.locator("button.lm").first().click();

  const mailFrame = yopmailPage.frameLocator("#ifmail");
  const verifyButton = mailFrame.locator("a:has-text('Verify Email')");

  await verifyButton.waitFor({ timeout: 30000 });

  const [verifiedPage] = await Promise.all([
    page.context().waitForEvent("page"),
    verifyButton.click(),
  ]);

  await verifiedPage.waitForLoadState("networkidle");
  await yopmailPage.close();

  return verifiedPage;
}

/* =========================================================
   LOCATORS
   ========================================================= */

const locators = {
  signInButton: (page) => page.locator("button.signinButton"),
  registerNowButton: (page) => page.locator("button.registerBtn"),
  createAccountHeader: (page) => page.locator("h1.modalTitleValue"),
  emailInput: (page) => page.locator('input[placeholder="Username or Email"]'),
  passwordInput: (page) => page.locator('input[placeholder="Enter password"]'),
  institutionInput: (page) =>
    page.locator('input[placeholder="Enter Institution / Organization name"]'),
  signUpButton: (page) =>
    page.locator('button[type="submit"]:has-text("Sign Up")'),
  loginSubmitButton: (page) =>
    page.locator('button[type="submit"]:has-text("Sign In")'),

  /* PROFILE / LOGOUT */
  profileIcon: (page) => page.locator("div.defaultProfileImg"),
  myProfileMenu: (page) => page.locator('a:has-text("My Profile")'),
  logoutButton: (page) =>
    page.locator('a[href*="/logout/"]'),

  emailSentMessage: (page) => page.locator("text=An email has been sent"),
};

/* =========================================================
   TEST SUITE: SIGNUP + VERIFY + LOGIN + LOGOUT
   ========================================================= */

test.describe.serial(
  "FRQ-AUTH-01 Fully Automated Signup + Verification + Logout",
  () => {
    let page;
    let context;
    let email;
    let password;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      page = await context.newPage();
    });

    test.afterAll(async () => {
      await context.close();
    });

    /* =====================================================
       SC-AUTH-0101: Signup
       ===================================================== */
    test(
      qase(101, "SC-AUTH-0101 Register new user successfully"),
      async () => {
        email = generateYopmailEmail();
        password = generateStrongPassword();

        await page.goto(baseUrl, { waitUntil: "networkidle" });

        const signInBtn = locators.signInButton(page);
        await expect(signInBtn).toBeVisible({ timeout: 45000 });
        await signInBtn.scrollIntoViewIfNeeded();
        await signInBtn.click();

        const registerBtn = locators.registerNowButton(page);
        await expect(registerBtn).toBeVisible({ timeout: 10000 });
        await registerBtn.click();

        await expect(locators.createAccountHeader(page)).toBeVisible({
          timeout: 10000,
        });

        await locators.emailInput(page).fill(email);
        await locators.passwordInput(page).fill(password);
        await locators.institutionInput(page).fill("ABC Institution");

        await locators.signUpButton(page).click();

        // Wait for "email sent" confirmation
        await expect(locators.emailSentMessage(page)).toBeVisible({
          timeout: 15000,
        });

        console.log("Signup completed:", email);
      }
    );

    /* =====================================================
       SC-AUTH-0102: Verify Email + Login
       ===================================================== */
    test(
      qase(
        102,
        "SC-AUTH-0102 Verify email, login and confirm user logged in"
      ),
      async () => {
        // Step 1: Verify Email via Yopmail
        page = await verifyEmailFromYopmail(page, email);

        // Step 2: Login
        const signInBtn = locators.signInButton(page);
        await expect(signInBtn).toBeVisible({ timeout: 30000 });
        await signInBtn.scrollIntoViewIfNeeded();
        await signInBtn.click();

        await locators.emailInput(page).fill(email);
        await locators.passwordInput(page).fill(password);
        await locators.loginSubmitButton(page).click();

        await page.waitForLoadState("networkidle");

        // Validate user is logged in (SignIn button disappears)
        await expect(locators.signInButton(page)).toHaveCount(0, {
          timeout: 20000,
        });

        // Optional: check profile icon visible
        await expect(locators.profileIcon(page)).toBeVisible();

        console.log("User verified and logged in successfully.");
      }
    );

    /* =====================================================
       SC-AUTH-0103: Logout
       ===================================================== */
    test(
      qase(103, "SC-AUTH-0103 Logout user successfully"),
      async () => {
        // Click profile icon
        const profileIcon = locators.profileIcon(page);
        await expect(profileIcon).toBeVisible({ timeout: 10000 });
        await profileIcon.scrollIntoViewIfNeeded();
        await profileIcon.click();

        // Click logout button
        const logoutBtn = locators.logoutButton(page);
        await expect(logoutBtn).toBeVisible({ timeout: 10000 });
        await logoutBtn.scrollIntoViewIfNeeded();
        await logoutBtn.click();

        // Validate logout success
        await expect(locators.signInButton(page)).toBeVisible({ timeout: 20000 });

        console.log("User logged out successfully.");
      }
    );
  }
);
