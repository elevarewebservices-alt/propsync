# Registers PrivacyInfo.xcprivacy in the App target's "Copy Bundle Resources"
# build phase. Capacitor's iOS project is regenerated on every CI build and the
# template doesn't ship a privacy manifest, so we add the file reference here.
# Idempotent — safe to run on a project that already has it.
require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

target = project.targets.find { |t| t.name == 'App' }
raise "App target not found in #{project_path}" unless target

group = project.main_group['App']
raise "App group not found" unless group

already = group.files.any? { |f| f.display_name == 'PrivacyInfo.xcprivacy' }
if already
  puts 'PrivacyInfo.xcprivacy already registered — skipping.'
else
  file_ref = group.new_file('PrivacyInfo.xcprivacy')
  target.add_resources([file_ref])
  project.save
  puts 'Registered PrivacyInfo.xcprivacy in the App target.'
end
