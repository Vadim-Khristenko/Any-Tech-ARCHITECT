import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";
import fs from "node:fs";
import {
  detectHostPlatform,
  normalizeBase,
  inferBase,
  inferSiteOrigin,
  makeAbsoluteUrl,
} from "../../../vite.config";

// Mock fs.existsSync to return false during tests (no CNAME file in test env)
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
  },
  existsSync: vi.fn(() => false),
}));

describe("vite.config.ts URL and CI helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };

    // Clear CI/CD specific environment variables
    delete process.env.VITE_DEPLOY_PLATFORM;
    delete process.env.DEPLOY_PLATFORM;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITLAB_CI;
    delete process.env.CI_PROJECT_PATH;
    delete process.env.CI_PAGES_URL;
    delete process.env.PAGES_URL;
    delete process.env.CI_SERVER_HOST;
    delete process.env.CF_PAGES;
    delete process.env.CF_PAGES_URL;
    delete process.env.CLOUDFLARE_PAGES_URL;
    delete process.env.VITE_BASE;
    delete process.env.BASE_URL;
    delete process.env.ASSET_BASE;
    delete process.env.PUBLIC_URL;
    delete process.env.VITE_SITE_ORIGIN;
    delete process.env.SITE_ORIGIN;
    delete process.env.VITE_PUBLIC_SITE_URL;
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.VITE_USE_CUSTOM_DOMAIN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("detectHostPlatform()", () => {
    it("detects github actions", () => {
      process.env.GITHUB_ACTIONS = "true";
      expect(detectHostPlatform()).toBe("github");
    });

    it("detects gitlab ci", () => {
      process.env.GITLAB_CI = "true";
      expect(detectHostPlatform()).toBe("gitlab");
    });

    it("detects cloudflare pages", () => {
      process.env.CF_PAGES = "1";
      expect(detectHostPlatform()).toBe("cloudflare");
    });

    it("respects explicit deploy platform override", () => {
      process.env.VITE_DEPLOY_PLATFORM = "cloudflare";
      process.env.GITHUB_ACTIONS = "true"; // should be ignored
      expect(detectHostPlatform()).toBe("cloudflare");
    });

    it("defaults to generic", () => {
      expect(detectHostPlatform()).toBe("generic");
    });
  });

  describe("normalizeBase()", () => {
    it("returns / for empty input", () => {
      expect(normalizeBase()).toBe("/");
      expect(normalizeBase("")).toBe("/");
      expect(normalizeBase(null)).toBe("/");
    });

    it("preserves relative paths", () => {
      expect(normalizeBase(".")).toBe("./");
      expect(normalizeBase("./")).toBe("./");
    });

    it("preserves root path", () => {
      expect(normalizeBase("/")).toBe("/");
    });

    it("wraps custom paths in slashes", () => {
      expect(normalizeBase("repo")).toBe("/repo/");
      expect(normalizeBase("/repo")).toBe("/repo/");
      expect(normalizeBase("repo/")).toBe("/repo/");
      expect(normalizeBase("/repo/path/")).toBe("/repo/path/");
    });
  });

  describe("inferBase()", () => {
    it("uses explicit VITE_BASE if provided", () => {
      process.env.VITE_BASE = "/custom/";
      expect(inferBase()).toBe("/custom/");
    });

    it("uses / for cloudflare", () => {
      process.env.CF_PAGES = "true";
      expect(inferBase()).toBe("/");
    });

    it("uses / for github actions with custom domain (CNAME)", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.GITHUB_REPOSITORY = "owner/my-repo";
      process.env.VITE_USE_CUSTOM_DOMAIN = "true";
      expect(inferBase()).toBe("/");
    });

    it("uses repo name for github actions without custom domain", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.GITHUB_REPOSITORY = "owner/my-repo";
      process.env.VITE_USE_CUSTOM_DOMAIN = "false";
      expect(inferBase()).toBe("/my-repo/");
    });

    it("uses root for github actions without repo", () => {
      process.env.GITHUB_ACTIONS = "true";
      expect(inferBase()).toBe("/");
    });

    it("uses path from CI_PAGES_URL for gitlab ci", () => {
      process.env.GITLAB_CI = "true";
      process.env.CI_PAGES_URL = "https://user.gitlab.io/my-group/my-project";
      expect(inferBase()).toBe("/my-group/my-project/");
    });

    it("uses root for gitlab ci without CI_PAGES_URL", () => {
      process.env.GITLAB_CI = "true";
      expect(inferBase()).toBe("/");
    });

    it("defaults to ./ for generic", () => {
      expect(inferBase()).toBe("./");
    });
  });

  describe("inferSiteOrigin()", () => {
    it("returns explicit origin stripped of trailing slashes", () => {
      process.env.VITE_SITE_ORIGIN = "https://example.com/";
      expect(inferSiteOrigin()).toBe("https://example.com");
    });

    it("returns custom domain for architect.vai-rice.space", () => {
      process.env.VITE_USE_CUSTOM_DOMAIN = "true";
      expect(inferSiteOrigin()).toBe("https://architect.vai-rice.space");
    });

    it("infers from GITHUB_REPOSITORY", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.GITHUB_REPOSITORY = "User/Repo";
      expect(inferSiteOrigin()).toBe("https://user.github.io/Repo");
    });

    it("infers from GitLab CI_PAGES_URL", () => {
      process.env.GITLAB_CI = "true";
      process.env.CI_PAGES_URL = "https://user.gitlab.io/repo/";
      expect(inferSiteOrigin()).toBe("https://user.gitlab.io/repo");
    });

    it("infers from GitLab project properties if CI_PAGES_URL is absent", () => {
      process.env.GITLAB_CI = "true";
      process.env.CI_PROJECT_PATH = "group/project";
      process.env.CI_SERVER_HOST = "gitlab.com";
      expect(inferSiteOrigin()).toBe("https://gitlab.com/group/project");
    });

    it("infers from Cloudflare CF_PAGES_URL", () => {
      process.env.CF_PAGES_URL = "https://my-app.pages.dev/";
      expect(inferSiteOrigin()).toBe("https://my-app.pages.dev");
    });

    it("returns empty string if nothing matches", () => {
      expect(inferSiteOrigin()).toBe("");
    });
  });

  describe("makeAbsoluteUrl()", () => {
    it("constructs full URL when origin is provided", () => {
      expect(
        makeAbsoluteUrl("https://example.com", "/base/", "assets/img.png"),
      ).toBe("https://example.com/assets/img.png");
    });

    it("strips duplicate slashes correctly", () => {
      expect(
        makeAbsoluteUrl("https://example.com/", "/base/", "/assets/img.png"),
      ).toBe("https://example.com/assets/img.png");
    });

    it("constructs relative fallback when origin is empty and base is ./", () => {
      expect(makeAbsoluteUrl("", "./", "assets/img.png")).toBe(
        "./assets/img.png",
      );
    });

    it("constructs base path fallback when origin is empty and base is set", () => {
      expect(makeAbsoluteUrl("", "/repo/", "assets/img.png")).toBe(
        "/repo/assets/img.png",
      );
    });
  });
});
