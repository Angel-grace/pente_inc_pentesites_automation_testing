import { test, expect } from "@playwright/test";
import { qase } from "playwright-qase-reporter";
import { urls, testData } from "../data/testData.js";

const baseUrl = urls.careplus;

/* =========================================================
   Helper Functions
   ========================================================= */

function generateYopmailEmail() {
  const random = Math.random().toString(36).substring(2, 8);
  return `careplus_${random}@yopmail.com`;}
function generateRandomPhone() {
  return `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`;}
async function getOtpFromYopmail(page, email) {
  const inboxName = email.split("@")[0];
  const yopmailPage = await page.context().newPage();
  await yopmailPage.goto(urls.yopmail, { waitUntil: "domcontentloaded" });
  const inboxInput = yopmailPage.locator("#login");
  await inboxInput.waitFor({ state: "visible" });
  await inboxInput.fill(inboxName);
  await inboxInput.press("Enter");
  const inboxFrame = yopmailPage.frameLocator("#ifinbox");
  await inboxFrame.locator("button.lm").first().waitFor({ timeout: 30000 });
  await inboxFrame.locator("button.lm").first().click();
  await yopmailPage.waitForTimeout(2000);
  const mailFrame = yopmailPage.frame({ name: "ifmail" });
  if (!mailFrame) {
    throw new Error("Mail iframe not found");}
  const bodyText = await mailFrame.evaluate(() => document.body.innerText);
  const otpMatch = bodyText.match(/\b\d{6}\b/);
  if (!otpMatch) {
    throw new Error("OTP not found in Yopmail inbox");}
  await yopmailPage.close();
  return otpMatch[0];}

/* =========================================================
   Locators
   ========================================================= */

const locators = {
  authHeader: (page) => page.locator('h2:text("Authenticate")'),
  emailInput: (page) => page.locator("#auth-email"),
  phoneInput: (page) => page.locator("#auth-phone"),
  authenticateButton: (page) => page.locator('button[type="submit"]:has-text("Authenticate")'),
  otpLabel: (page) => page.locator('label[for="auth-otp"]:has-text("One-time passcode")'),
  otpInput: (page) => page.locator("#auth-otp"),
  verifyOtpButton: (page) => page.locator('button[type="submit"]:has-text("Verify OTP")'),
  mainHeading: (page) => page.locator('h1:has-text("Experience"):has-text("Excellence"):has-text("Health Services")'),
  mainSubHeading: (page) => page.locator('p:has-text("We offer health services at a highly innovative level")'),
  mainAppointmentButton: (page) => page.locator('a[href="/contact"]:has-text("Book Appointment")'),
  chatbotHeader: (page) => page.locator('h2:has-text("Care Assistant")'),
  chatbotSubTitle: (page) => page.locator('text=Always here to help'),
  closeChatButton: (page) => page.locator('button[aria-label="Close chat sidebar"]'),
  openChatButton: (page) => page.locator('button[aria-label="Open chat sidebar"]'),
  chatMessages: (page) => page.locator('.chat-scrollbar'),
  firstAiMessage: (page) => page.locator('.rounded-2xl.bg-secondary').first(),
  messageInput: (page) => page.locator('input[placeholder="Type a message..."]'),
  sendButton: (page) => page.locator('button[aria-label="Send chat message"]'),
  userMessage: (page, text) => locators.chatMessages(page).locator('div.flex.items-start.justify-end').filter({ hasText: text }).last(),
  processingIndicator: (page) => page.locator('text=Processing your request'),
  aiResponse: (page) => page.locator('div:has(svg.lucide-bot) >> p')};

/* =========================================================
   FRQ-CHAT-10 Chatbot UI & Message Flow Tests
   ========================================================= */

test.describe.serial("FRQ-CHAT-10 Chatbot UI & Message Flow Tests", () => { let page;

  /* =========================================================
     Authentication (RUNS ONCE)
     ========================================================= */

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({
      recordVideo: { dir: "test-results/videos", size: { width: 1280, height: 720 },},});
    page = await context.newPage();
    await page.goto(baseUrl);
    await page.waitForLoadState("networkidle");
    await expect(locators.authHeader(page)).toBeVisible();
    const email = generateYopmailEmail();
    const phone = generateRandomPhone();
    console.log("Generated email:", email);
    console.log("Generated phone:", phone);
    await locators.emailInput(page).fill(email);
    await locators.phoneInput(page).fill(phone);
    await page.keyboard.press("Tab");
    await expect(locators.authenticateButton(page)).toBeEnabled();
    await locators.authenticateButton(page).click();
    await locators.otpInput(page).waitFor({ state: "visible" });
    await expect(locators.otpLabel(page)).toBeVisible();
    const otp = await getOtpFromYopmail(page, email);
    console.log("OTP extracted:", otp);
    await locators.otpInput(page).fill(otp);
    await locators.verifyOtpButton(page).click();
    await expect(page.locator('h2:text("Care Assistant")')).toBeVisible({ timeout: 15000 });});

  test(qase(61, "SC-CHAT-1001 Check UI page rendered correctly"),async () => {
    await expect(locators.mainHeading(page)).toBeVisible();
    await expect(locators.mainSubHeading(page)).toBeVisible();
    await expect(locators.mainAppointmentButton(page)).toBeVisible();
    await expect(locators.mainAppointmentButton(page)).toBeEnabled();});

  test(qase(62, "SC-CHAT-1002 Check if the chatbot is accessible"), async () => {
    await expect(locators.chatbotHeader(page)).toBeVisible();
    await expect(locators.chatbotSubTitle(page)).toBeVisible();
    await expect(locators.closeChatButton(page)).toBeVisible();
    await expect(locators.closeChatButton(page)).toBeEnabled();
    await locators.closeChatButton(page).click();
    await expect(locators.openChatButton(page)).toBeVisible();
    await expect(locators.openChatButton(page)).toBeEnabled();
    await locators.openChatButton(page).click();
    await expect(locators.chatbotHeader(page)).toBeVisible({ timeout: 5000 });
    await expect(locators.chatbotSubTitle(page)).toBeVisible();});

  test(qase(63, "SC-CHAT-1003 Check if you can send message to the chatbot"),async () => {
    await expect(locators.firstAiMessage(page)).toBeVisible();
    await expect(locators.messageInput(page)).toBeVisible();
    await expect(locators.messageInput(page)).toBeEnabled();
    await expect(locators.sendButton(page)).toBeDisabled();
    await locators.messageInput(page).fill(testData.userInput1);
    await expect(locators.sendButton(page)).toBeEnabled();
    await locators.sendButton(page).click();
    await expect(locators.userMessage(page, testData.userInput1)).toBeVisible();
    await expect.poll(async () => {
      if (await locators.aiResponse(page).first().isVisible()) {
        return "responded";}
      if (await locators.processingIndicator(page).isVisible()) {
        return "processing";}
      return "waiting";}, {timeout: 30000, message: "Waiting for AI response",}).toBe("responded");
    await expect(locators.aiResponse(page).first()).toBeVisible();});

  test(qase(64, "SC-CHAT-1004 Check AI response and Page Navigation: Services"),async () => {
    await expect(locators.messageInput(page)).toBeVisible();
    await locators.messageInput(page).fill(testData.userInput2);
    await locators.sendButton(page).click();
    await expect(locators.userMessage(page, testData.userInput2)).toBeVisible();
    await expect.poll(async () => {
      if (await locators.aiResponse(page).last().isVisible()) {
        return "responded";}
      if (await locators.processingIndicator(page).isVisible()) {
        return "processing";}
      return "waiting";},{timeout: 30000, message: "Waiting for AI services response",}).toBe("responded");
    const latestAiResponse = locators.aiResponse(page).last();
    await expect(latestAiResponse).toBeVisible();
    await expect(latestAiResponse).toContainText(["service", "care", "therapy", "health",]);
    const servicesPageTitle = page.locator('h2:has-text("Our Comprehensive Home Health Care Programs")');
    await expect(servicesPageTitle).toBeVisible({ timeout: 15000 });
    const servicesSectionHeader = page.locator('h3:has-text("Services Offered Include")');
    await expect(servicesSectionHeader).toBeVisible();
    const servicesList = page.locator('div[data-slot="card-content"]');
    await expect(servicesList).toContainText(["Skilled Nursing", "Physical Therapy", "Occupational Therapy", "Speech Therapy", "Home Health Aide", "Wound Care",]);});

});
