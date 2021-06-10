# frozen_string_literal: true

require 'rails_helper'

describe Guardian do
  let(:user) { Fabricate(:user, trust_level: TrustLevel[1]) }
  let(:user1) { Fabricate(:user, trust_level: TrustLevel[0]) }
  let(:admin) { Fabricate(:user, trust_level: TrustLevel[0], admin: true) }
  let(:moderator) { Fabricate(:user, trust_level: TrustLevel[0], moderator: true) }
  let(:guardian) { Guardian.new(user) }
  let(:guardian1) { Guardian.new(user1) }
  let(:adminGuardian) { Guardian.new(admin) }
  let(:moderatorGuardian) { Guardian.new(moderator) }

  before do
    SiteSetting.discourse_video_enabled = true
  end

  describe "can_upload_video?" do
    it "returns true for users having specified trust level" do
      expect(guardian.can_upload_video?).to eq(true)
    end

    it "returns false for users not having specified trust level" do
      expect(guardian1.can_upload_video?).to eq(false)
    end

    it "returns true if user is admin/moderator" do
      expect(adminGuardian.can_upload_video?).to eq(true)

      expect(moderatorGuardian.can_upload_video?).to eq(true)
    end
  end
end
