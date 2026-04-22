# config/initializers/rack_attack.rb
class Rack::Attack
  throttle("submissions/ip", limit: 10, period: 1.hour) do |req|
    req.ip if req.path == "/submissions" && req.post?
  end

  throttle("submissions/ip/day", limit: 50, period: 1.day) do |req|
    req.ip if req.path == "/submissions" && req.post?
  end

  self.throttled_responder = lambda do |_req|
    [429, { "Content-Type" => "text/plain" }, ["Prea multe încercări. Încearcă mai târziu."]]
  end
end