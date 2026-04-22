Rails.application.routes.draw do
  get "pages/home"
  root "pages#home"

  get "citeste", to: "submissions#new", as: :citeste
  get "spune", to: "submissions#new", as: :spune

  resources :submissions, only: [:create] do
    collection do
      get :thank_you
    end
  end

  namespace :admin do
    resources :submissions, only: [:index, :show, :update, :destroy] do
      get :download, on: :member
    end
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end
