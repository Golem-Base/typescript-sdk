import { expect } from "chai"
import { describe, it } from "node:test"
import {
  isValidHex,
  isValidEntityKey,
  isValidAddress,
  isValidAnnotationKey,
  isValidBTL,
  BTL_PRESETS,
  ANNOTATION_KEYS,
  isBTLPreset,
  Annotation,
} from "../src/index"
import {
  generateRandomEntityKey,
  generateRandomAddress,
  createTestStringAnnotation,
  createTestNumericAnnotation,
  generateRandomBTL,
} from "./utils"

describe("GolemBase SDK Utils", () => {
  describe("isValidHex", () => {
    it("should validate correct hex strings", () => {
      expect(isValidHex("0x1234")).to.be.true
      expect(isValidHex("0xabcdef")).to.be.true
      expect(isValidHex("0xABCDEF")).to.be.true
      expect(isValidHex("0x1234567890abcdef")).to.be.true
    })

    it("should reject invalid hex strings", () => {
      expect(isValidHex("1234")).to.be.false // no 0x prefix
      expect(isValidHex("0x123")).to.be.false // odd length
      expect(isValidHex("0xGHIJ")).to.be.false // invalid characters
      expect(isValidHex("")).to.be.false // empty string
      expect(isValidHex("0x")).to.be.false // just prefix
    })

    it("should reject non-string inputs", () => {
      expect(isValidHex(123 as any)).to.be.false
      expect(isValidHex(null as any)).to.be.false
      expect(isValidHex(undefined as any)).to.be.false
    })
  })

  describe("isValidEntityKey", () => {
    it("should validate 32-byte hex strings", () => {
      const validKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      expect(isValidEntityKey(validKey)).to.be.true
    })

    it("should reject incorrect length hex strings", () => {
      expect(isValidEntityKey("0x1234")).to.be.false // too short
      expect(isValidEntityKey("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12")).to.be.false // too long
    })

    it("should reject invalid hex strings", () => {
      expect(isValidEntityKey("invalid")).to.be.false
      expect(isValidEntityKey("")).to.be.false
    })

    it("should work with generated random keys", () => {
      for (let i = 0; i < 10; i++) {
        const key = generateRandomEntityKey()
        expect(isValidEntityKey(key)).to.be.true
      }
    })
  })

  describe("isValidAddress", () => {
    it("should validate 20-byte hex strings", () => {
      const validAddress = "0x742d35Cc9e1e3FbD000de0e98a3b8b8c0d3b2F8e"
      expect(isValidAddress(validAddress)).to.be.true
    })

    it("should reject incorrect length hex strings", () => {
      expect(isValidAddress("0x1234")).to.be.false // too short
      expect(isValidAddress("0x742d35Cc9e1e3FbD000de0e98a3b8b8c0d3b2F8e12")).to.be.false // too long
    })

    it("should work with generated random addresses", () => {
      for (let i = 0; i < 10; i++) {
        const address = generateRandomAddress()
        expect(isValidAddress(address)).to.be.true
      }
    })
  })

  describe("isValidAnnotationKey", () => {
    it("should validate proper string keys", () => {
      expect(isValidAnnotationKey("type")).to.be.true
      expect(isValidAnnotationKey("my-key")).to.be.true
      expect(isValidAnnotationKey("key123")).to.be.true
      expect(isValidAnnotationKey("a")).to.be.true
    })

    it("should reject empty or whitespace-only keys", () => {
      expect(isValidAnnotationKey("")).to.be.false
      expect(isValidAnnotationKey("   ")).to.be.false
      expect(isValidAnnotationKey("\t\n")).to.be.false
    })

    it("should reject non-string inputs", () => {
      expect(isValidAnnotationKey(123)).to.be.false
      expect(isValidAnnotationKey(null)).to.be.false
      expect(isValidAnnotationKey(undefined)).to.be.false
      expect(isValidAnnotationKey({})).to.be.false
    })
  })

  describe("isValidBTL", () => {
    it("should validate positive integers", () => {
      expect(isValidBTL(1)).to.be.true
      expect(isValidBTL(100)).to.be.true
      expect(isValidBTL(1000)).to.be.true
    })

    it("should reject zero and negative numbers", () => {
      expect(isValidBTL(0)).to.be.false
      expect(isValidBTL(-1)).to.be.false
      expect(isValidBTL(-100)).to.be.false
    })

    it("should reject non-integer numbers", () => {
      expect(isValidBTL(1.5)).to.be.false
      expect(isValidBTL(3.14159)).to.be.false
    })

    it("should reject non-number inputs", () => {
      expect(isValidBTL("100")).to.be.false
      expect(isValidBTL(null)).to.be.false
      expect(isValidBTL(undefined)).to.be.false
    })

    it("should work with generated random BTL values", () => {
      for (let i = 0; i < 10; i++) {
        const btl = generateRandomBTL()
        expect(isValidBTL(btl)).to.be.true
      }
    })
  })

  describe("BTL_PRESETS", () => {
    it("should contain expected preset values", () => {
      expect(BTL_PRESETS.SHORT).to.equal(100)
      expect(BTL_PRESETS.MEDIUM).to.equal(1200)
      expect(BTL_PRESETS.LONG).to.equal(7200)
      expect(BTL_PRESETS.PERMANENT).to.equal(216000)
    })

    it("all presets should be valid BTL values", () => {
      Object.values(BTL_PRESETS).forEach(preset => {
        expect(isValidBTL(preset)).to.be.true
      })
    })
  })

  describe("isBTLPreset", () => {
    it("should recognize preset values", () => {
      expect(isBTLPreset(BTL_PRESETS.SHORT)).to.be.true
      expect(isBTLPreset(BTL_PRESETS.MEDIUM)).to.be.true
      expect(isBTLPreset(BTL_PRESETS.LONG)).to.be.true
      expect(isBTLPreset(BTL_PRESETS.PERMANENT)).to.be.true
    })

    it("should reject non-preset values", () => {
      expect(isBTLPreset(999)).to.be.false
      expect(isBTLPreset(1)).to.be.false
      expect(isBTLPreset(50000)).to.be.false
    })
  })

  describe("ANNOTATION_KEYS", () => {
    it("should contain expected key constants", () => {
      expect(ANNOTATION_KEYS.TYPE).to.equal('type')
      expect(ANNOTATION_KEYS.CATEGORY).to.equal('category')
      expect(ANNOTATION_KEYS.PRIORITY).to.equal('priority')
      expect(ANNOTATION_KEYS.TIMESTAMP).to.equal('timestamp')
      expect(ANNOTATION_KEYS.VERSION).to.equal('version')
      expect(ANNOTATION_KEYS.STATUS).to.equal('status')
      expect(ANNOTATION_KEYS.OWNER).to.equal('owner')
      expect(ANNOTATION_KEYS.TAG).to.equal('tag')
    })

    it("all annotation keys should be valid", () => {
      Object.values(ANNOTATION_KEYS).forEach(key => {
        expect(isValidAnnotationKey(key)).to.be.true
      })
    })
  })

  describe("Annotation static methods", () => {
    describe("createString", () => {
      it("should create string annotations", () => {
        const annotation = Annotation.createString("type", "test")
        expect(annotation.key).to.equal("type")
        expect(annotation.value).to.equal("test")
      })
    })

    describe("createNumeric", () => {
      it("should create numeric annotations", () => {
        const annotation = Annotation.createNumeric("priority", 5)
        expect(annotation.key).to.equal("priority")
        expect(annotation.value).to.equal(5)
      })
    })

    describe("createTimestamp", () => {
      it("should create timestamp annotation with default key", () => {
        const annotation = Annotation.createTimestamp()
        expect(annotation.key).to.equal("timestamp")
        expect(typeof annotation.value).to.equal("number")
        expect(annotation.value).to.be.greaterThan(0)
      })

      it("should create timestamp annotation with custom key", () => {
        const annotation = Annotation.createTimestamp("created_at")
        expect(annotation.key).to.equal("created_at")
        expect(typeof annotation.value).to.equal("number")
      })

      it("should create timestamps close to current time", () => {
        const before = Date.now()
        const annotation = Annotation.createTimestamp()
        const after = Date.now()
        
        expect(annotation.value).to.be.at.least(before)
        expect(annotation.value).to.be.at.most(after)
      })
    })
  })

  describe("Test utilities", () => {
    describe("createTestStringAnnotation", () => {
      it("should create random annotations when no params provided", () => {
        const annotation = createTestStringAnnotation()
        expect(isValidAnnotationKey(annotation.key)).to.be.true
        expect(typeof annotation.value).to.equal("string")
        expect(annotation.value.length).to.be.greaterThan(0)
      })

      it("should use provided key and value", () => {
        const annotation = createTestStringAnnotation("test_key", "test_value")
        expect(annotation.key).to.equal("test_key")
        expect(annotation.value).to.equal("test_value")
      })
    })

    describe("createTestNumericAnnotation", () => {
      it("should create random annotations when no params provided", () => {
        const annotation = createTestNumericAnnotation()
        expect(isValidAnnotationKey(annotation.key)).to.be.true
        expect(typeof annotation.value).to.equal("number")
      })

      it("should use provided key and value", () => {
        const annotation = createTestNumericAnnotation("test_key", 42)
        expect(annotation.key).to.equal("test_key")
        expect(annotation.value).to.equal(42)
      })
    })
  })
})
