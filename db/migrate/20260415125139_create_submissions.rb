class CreateSubmissions < ActiveRecord::Migration[8.1]
  def change
    create_table :submissions do |t|
      t.string :story_type, null: false
      t.string :input_type, null: false 
      t.string :status, null: false, default: "pending"
      t.string :ip_address
      t.integer :duration

      t.timestamps
    end
    add_index :submissions, :status
    add_index :submissions, :ip_address
    add_index :submissions, :created_at
  end
end
