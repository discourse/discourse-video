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

  describe "can_upload_video?" do
    it "returns true for users having specified trust level" do
      expect(guardian.can_upload_video?).to eq(true)
    end
  end
end
